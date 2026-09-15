import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AvatarService } from '../../services/avatar.service';
import type { AvatarStyle } from '../../models/user.model';

/**
 * User profile component for header display
 * Shows avatar, username, and logout option
 */
@Component({
  standalone: true,
  selector: 'app-user-profile',
  imports: [],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileComponent {
  protected auth = inject(AuthService);
  protected avatarService = inject(AvatarService);
  private router = inject(Router);

  user = this.auth.currentUser;

  getAvatarUrl = computed(() => {
    const currentUser = this.user();
    if (!currentUser) return '';
    return this.avatarService.generateAvatarUrl(
      currentUser.username,
      currentUser.avatar_style as AvatarStyle
    );
  });

  /**
   * Switch user - logout and redirect to login page
   */
  async switchUser(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
