import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DeutschService } from '../../services/vocab.service';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';
import type { VocabList, VocabWord } from '../../models/vocab.model';
import type { User } from '../../models/user.model';

@Component({
  selector: 'app-vocab-management',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './vocab-management.html',
  styleUrls: ['./vocab-management.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VocabManagementComponent implements OnInit {
  private deutschService = inject(DeutschService);
  private supabase = inject(SupabaseService);
  protected auth = inject(AuthService);

  // ---- Lists ----
  readonly lists = signal<VocabList[]>([]);
  readonly selectedListId = signal<string | null>(null);
  readonly selectedList = computed(() =>
    this.lists().find(l => l.id === this.selectedListId()) ?? null
  );

  // New/rename list
  readonly newListName = signal('');
  readonly renamingListId = signal<string | null>(null);
  readonly renameListValue = signal('');

  // ---- Words ----
  readonly words = signal<VocabWord[]>([]);
  readonly newWord = signal('');
  readonly editingWordId = signal<string | null>(null);
  readonly editingWordValue = signal('');

  // ---- Users ----
  readonly allUsers = signal<User[]>([]);
  readonly assignedUserIds = signal<Set<string>>(new Set());

  readonly isLoading = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadLists();
    try {
      const users = await this.supabase.getAllUsers();
      this.allUsers.set(users);
    } catch {
      this.allUsers.set([]);
    }
  }

  private async loadLists(): Promise<void> {
    const result = await this.supabase.getVocabLists();
    this.lists.set(result);
  }

  // ============================================================================
  // LISTS
  // ============================================================================

  async selectList(list: VocabList): Promise<void> {
    this.selectedListId.set(list.id);
    await this.loadWordsForList(list.id);
    await this.loadAssignmentsForList(list.id);
  }

  private async loadWordsForList(listId: string): Promise<void> {
    const result = await this.supabase.getVocabListWords(listId);
    this.words.set(result);
  }

  private async loadAssignmentsForList(listId: string): Promise<void> {
    const assignments = await Promise.all(
      this.allUsers().map(async user => {
        const userAssignments = await this.supabase.getVocabAssignmentsForUser(user.id);
        return { userId: user.id, assigned: userAssignments.some(a => a.list_id === listId) };
      })
    );
    const assignedIds = new Set(
      assignments.filter(a => a.assigned).map(a => a.userId)
    );
    this.assignedUserIds.set(assignedIds);
  }

  async createList(): Promise<void> {
    const name = this.newListName().trim() || 'Neue Liste';
    await this.supabase.createVocabList(name);
    this.newListName.set('');
    await this.loadLists();
  }

  startRenameList(list: VocabList): void {
    this.renamingListId.set(list.id);
    this.renameListValue.set(list.name);
  }

  async saveRenameList(): Promise<void> {
    const id = this.renamingListId();
    if (!id) return;
    const name = this.renameListValue().trim();
    if (name) {
      await this.supabase.updateVocabList(id, name);
      await this.loadLists();
    }
    this.renamingListId.set(null);
  }

  cancelRenameList(): void {
    this.renamingListId.set(null);
  }

  async deleteList(list: VocabList): Promise<void> {
    if (!confirm(`Liste "${list.name}" wirklich löschen?`)) return;
    await this.supabase.deleteVocabList(list.id);
    if (this.selectedListId() === list.id) {
      this.selectedListId.set(null);
      this.words.set([]);
    }
    await this.loadLists();
  }

  // ============================================================================
  // WORDS
  // ============================================================================

  async addWord(): Promise<void> {
    const listId = this.selectedListId();
    const word = this.newWord().trim();
    if (!listId || !word) return;

    await this.supabase.addVocabWord(listId, word);
    this.newWord.set('');
    await this.loadWordsForList(listId);

    // If list has no name yet, use first word
    const list = this.selectedList();
    if (list && list.name === 'Neue Liste') {
      await this.supabase.updateVocabList(listId, word);
      await this.loadLists();
    }
  }

  startEditWord(word: VocabWord): void {
    this.editingWordId.set(word.id);
    this.editingWordValue.set(word.word);
  }

  async saveEditWord(): Promise<void> {
    const id = this.editingWordId();
    if (!id) return;
    const word = this.editingWordValue().trim();
    if (word) {
      await this.supabase.updateVocabWord(id, word);
      const listId = this.selectedListId();
      if (listId) await this.loadWordsForList(listId);
    }
    this.editingWordId.set(null);
  }

  cancelEditWord(): void {
    this.editingWordId.set(null);
  }

  async deleteWord(word: VocabWord): Promise<void> {
    await this.supabase.deleteVocabWord(word.id);
    const listId = this.selectedListId();
    if (listId) await this.loadWordsForList(listId);
  }

  // ============================================================================
  // USER ASSIGNMENTS
  // ============================================================================

  async toggleAssignment(userId: string): Promise<void> {
    const listId = this.selectedListId();
    if (!listId) return;

    const current = new Set(this.assignedUserIds());
    if (current.has(userId)) {
      await this.supabase.unassignListFromUser(userId, listId);
      current.delete(userId);
    } else {
      await this.supabase.assignListToUser(userId, listId);
      current.add(userId);
    }
    this.assignedUserIds.set(current);
  }

  isAssigned(userId: string): boolean {
    return this.assignedUserIds().has(userId);
  }
}
