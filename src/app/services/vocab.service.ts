import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { VocabAssignment, VocabSessionWord } from '../models/vocab.model';

const DEFAULT_WORD_WEIGHT = 3;

@Injectable({ providedIn: 'root' })
export class DeutschService {
  private supabase = inject(SupabaseService);

  // Public signals
  readonly assignments = signal<VocabAssignment[]>([]);

  // Internal: word progress map keyed by word_id
  private wordProgressMap = signal<Record<string, number>>({});

  // ============================================================================
  // USER DATA LIFECYCLE
  // ============================================================================

  async loadUserData(userId: string): Promise<void> {
    try {
      const [assignments, progress] = await Promise.all([
        this.supabase.getVocabAssignmentsForUser(userId),
        this.supabase.getWordProgressForUser(userId),
      ]);

      this.assignments.set(assignments);

      const progressMap: Record<string, number> = {};
      for (const p of progress) {
        progressMap[p.word_id] = p.weight;
      }
      this.wordProgressMap.set(progressMap);
    } catch (error) {
      console.error('[DeutschService] Failed to load user data:', error);
    }
  }

  clearUserData(): void {
    this.assignments.set([]);
    this.wordProgressMap.set({});
  }

  // ============================================================================
  // SESSION BUILDING
  // ============================================================================

  /**
   * Build a weighted session queue from all assigned word lists.
   * The most-recently assigned list is "active" (full weights);
   * older assigned lists contribute with weight capped at 1.
   *
   * Words are returned in shuffled, weight-proportional order.
   */
  async buildSession(_userId: string): Promise<VocabSessionWord[]> {
    const sortedAssignments = [...this.assignments()].sort((a, b) => {
      const dateA = a.assigned_at ? new Date(a.assigned_at).getTime() : 0;
      const dateB = b.assigned_at ? new Date(b.assigned_at).getTime() : 0;
      return dateB - dateA;
    });

    if (sortedAssignments.length === 0) return [];

    const progressMap = this.wordProgressMap();
    const sessionWords: VocabSessionWord[] = [];

    for (let i = 0; i < sortedAssignments.length; i++) {
      const assignment = sortedAssignments[i];
      const listId = assignment.list_id;
      const isActive = i === 0;

      const words = await this.supabase.getVocabListWords(listId);

      for (const w of words) {
        const rawWeight = progressMap[w.id] ?? DEFAULT_WORD_WEIGHT;
        const weight = isActive ? rawWeight : Math.min(1, rawWeight);

        sessionWords.push({
          wordId: w.id,
          word: w.word,
          listId: w.list_id,
          weight,
        });
      }
    }

    return this.buildWeightedQueue(sessionWords);
  }

  /**
   * Repeat each word proportional to its weight, then shuffle.
   */
  private buildWeightedQueue(words: VocabSessionWord[]): VocabSessionWord[] {
    const queue: VocabSessionWord[] = [];
    for (const word of words) {
      for (let i = 0; i < word.weight; i++) {
        queue.push(word);
      }
    }
    // Fisher-Yates shuffle
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    return queue;
  }

  // ============================================================================
  // WEIGHT UPDATES
  // ============================================================================

  async updateWordWeight(userId: string, wordId: string, correct: boolean): Promise<void> {
    const map = this.wordProgressMap();
    const current = map[wordId] ?? DEFAULT_WORD_WEIGHT;

    const newWeight = correct ? Math.max(1, current - 1) : current + 2;

    // Optimistic local update
    this.wordProgressMap.set({ ...map, [wordId]: newWeight });

    // Persist to server
    try {
      await this.supabase.upsertWordProgress(userId, wordId, newWeight);
    } catch (error) {
      console.error('[DeutschService] Failed to update word weight:', error);
    }
  }
}
