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
import { EnglischService } from '../../services/englisch.service';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';
import type { VocabList, VocabWord } from '../../models/vocab.model';
import type { User } from '../../models/user.model';

@Component({
  selector: 'app-englisch-management',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './englisch-management.html',
  styleUrl: '../vocab-management/vocab-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnglischManagementComponent implements OnInit {
  private englischService = inject(EnglischService);
  private supabase = inject(SupabaseService);
  protected auth = inject(AuthService);

  readonly lists = signal<VocabList[]>([]);
  readonly selectedListId = signal<string | null>(null);
  readonly selectedList = computed(
    () => this.lists().find((l) => l.id === this.selectedListId()) ?? null
  );

  readonly newListName = signal('');
  readonly renamingListId = signal<string | null>(null);
  readonly renameListValue = signal('');

  readonly words = signal<VocabWord[]>([]);
  readonly newPromptEn = signal('');
  readonly newAnswerDe = signal('');
  readonly newContextEn = signal('');
  readonly editingWordId = signal<string | null>(null);
  readonly editingPromptEn = signal('');
  readonly editingAnswerDe = signal('');
  readonly editingContextEn = signal('');

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
    const languageId = await this.englischService.ensureLanguage();
    if (!languageId) {
      this.lists.set([]);
      return;
    }
    const result = await this.supabase.getVocabLists(languageId);
    this.lists.set(result);
  }

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
      this.allUsers().map(async (user) => {
        const userAssignments = await this.supabase.getVocabAssignmentsForUser(user.id);
        return { userId: user.id, assigned: userAssignments.some((a) => a.list_id === listId) };
      })
    );
    const assignedIds = new Set(assignments.filter((a) => a.assigned).map((a) => a.userId));
    this.assignedUserIds.set(assignedIds);
  }

  async createList(): Promise<void> {
    const languageId = await this.englischService.ensureLanguage();
    if (!languageId) return;
    const name = this.newListName().trim() || 'Neue Liste';
    await this.supabase.createVocabList(name, languageId);
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

  async addWord(): Promise<void> {
    const listId = this.selectedListId();
    const promptEn = this.newPromptEn().trim();
    const answerDe = this.newAnswerDe().trim();
    const contextEn = this.newContextEn().trim();
    if (!listId || !promptEn || !answerDe) return;

    await this.supabase.addEnglischWordPair(listId, {
      promptEn,
      answerDe,
      contextEn: contextEn || null,
    });
    this.newPromptEn.set('');
    this.newAnswerDe.set('');
    this.newContextEn.set('');
    await this.loadWordsForList(listId);

    const list = this.selectedList();
    if (list && list.name === 'Neue Liste') {
      await this.supabase.updateVocabList(listId, promptEn);
      await this.loadLists();
    }
  }

  startEditWord(word: VocabWord): void {
    this.editingWordId.set(word.id);
    this.editingPromptEn.set(word.prompt_en ?? word.word ?? '');
    this.editingAnswerDe.set(word.answer_de ?? '');
    this.editingContextEn.set(word.context_en ?? '');
  }

  async saveEditWord(): Promise<void> {
    const id = this.editingWordId();
    if (!id) return;
    const promptEn = this.editingPromptEn().trim();
    const answerDe = this.editingAnswerDe().trim();
    const contextEn = this.editingContextEn().trim();
    if (promptEn && answerDe) {
      await this.supabase.updateEnglischWordPair(id, {
        promptEn,
        answerDe,
        contextEn: contextEn || null,
      });
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
