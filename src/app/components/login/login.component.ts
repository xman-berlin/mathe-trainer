import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { AvatarService } from '../../services/avatar.service';
import { MigrationService } from '../../services/migration.service';
import type { User, AvatarStyle } from '../../models/user.model';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private avatarService = inject(AvatarService);
  private router = inject(Router);
  private migration = inject(MigrationService);

  // User list state
  users = signal<User[]>([]);
  searchTerm = signal('');
  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.users();

    return this.users().filter((u) => u.username.toLowerCase().includes(term));
  });

  // Create user modal state
  showCreateModal = signal(false);
  newUsername = signal('');
  selectedStyle = signal<AvatarStyle>('adventurer');
  avatarStyles = this.avatarService.getAvailableStyles();

  // Preview URL for create modal
  previewAvatarUrl = computed(() => {
    const username = this.newUsername() || 'preview';
    return this.avatarService.generateAvatarUrl(username, this.selectedStyle());
  });

  // Migration state
  showMigrationDialog = signal(false);

  // Loading state
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    // Check if already logged in
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/']);
      return;
    }

    // Check if migration is needed
    if (!this.migration.hasMigratedData() && this.migration.hasOldDataAvailable()) {
      this.showMigrationDialog.set(true);
    }

    // Load all users
    await this.loadUsers();
  }

  /**
   * Load all users from database
   */
  async loadUsers(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const users = await this.auth.getAllUsers();
      this.users.set(users);
    } catch (error) {
      console.error('Error loading users:', error);
      this.errorMessage.set('Fehler beim Laden der Benutzer. Bitte versuche es erneut.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Select a user and login
   */
  async selectUser(user: User): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.auth.login(user.username);
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Login error:', error);
      this.errorMessage.set('Fehler beim Anmelden. Bitte versuche es erneut.');
      this.isLoading.set(false);
    }
  }

  /**
   * Open create user modal
   */
  openCreateModal(): void {
    this.newUsername.set('');
    this.selectedStyle.set('adventurer');
    this.showCreateModal.set(true);
  }

  /**
   * Close create user modal
   */
  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  /**
   * Select avatar style
   */
  selectAvatarStyle(style: AvatarStyle): void {
    this.selectedStyle.set(style);
  }

  /**
   * Get style label for display
   */
  getStyleLabel(style: AvatarStyle): string {
    return this.avatarService.getStyleLabel(style);
  }

  /**
   * Validate username
   */
  isValidUsername = computed(() => {
    const username = this.newUsername();
    return username.length >= 2 && username.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(username);
  });

  /**
   * Create new user
   */
  async createUser(): Promise<void> {
    if (!this.isValidUsername()) {
      this.errorMessage.set('Benutzername muss 2-20 Zeichen lang sein (nur Buchstaben, Zahlen, - und _)');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const user = await this.auth.createUser({
        username: this.newUsername(),
        avatar_style: this.selectedStyle(),
      });

      console.log('User created:', user.id);

      // Check if migration is needed
      const shouldMigrate = this.migration.hasOldDataAvailable() && !this.migration.hasMigratedData();

      if (shouldMigrate) {
        console.log('Starting migration for new user...');
        await this.migrateExistingData(user.id);
        this.showMigrationDialog.set(false);
      }

      this.showCreateModal.set(false);
      this.router.navigate(['/']);
    } catch (error: any) {
      console.error('Create user error:', error);

      if (error.message?.includes('duplicate') || error.code === '23505') {
        this.errorMessage.set('Dieser Benutzername ist bereits vergeben.');
      } else {
        this.errorMessage.set('Fehler beim Erstellen des Benutzers. Bitte versuche es erneut.');
      }

      this.isLoading.set(false);
    }
  }

  /**
   * Get avatar URL for a user
   */
  getAvatarUrl(user: User): string {
    return this.avatarService.generateAvatarUrl(user.username, user.avatar_style as AvatarStyle);
  }

  /**
   * Get style preview URL for style selector
   */
  getStylePreview(style: AvatarStyle): string {
    return this.avatarService.generateAvatarUrl('preview', style);
  }

  /**
   * Format last active date
   */
  formatLastActive(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Wochen`;

    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // ============================================================================
  // MIGRATION METHODS
  // ============================================================================

  /**
   * Migrate existing data to new user (called after user creation)
   */
  private async migrateExistingData(userId: string): Promise<void> {
    try {
      await this.migration.migrateLocalDataToUser(userId);
      this.migration.clearOldData();
      console.log('Migration completed successfully for user:', userId);
    } catch (error) {
      console.error('Migration error:', error);
      this.errorMessage.set('Fehler beim Übertragen der Daten. Bitte versuche es erneut.');
    }
  }

  /**
   * User wants to migrate data - open create user dialog
   */
  migrateAndCreateUser(): void {
    this.showMigrationDialog.set(false);
    this.openCreateModal();
  }

  /**
   * Skip migration and create new user
   */
  startFresh(): void {
    this.migration.skipMigration();
    this.showMigrationDialog.set(false);
    this.openCreateModal();
  }
}
