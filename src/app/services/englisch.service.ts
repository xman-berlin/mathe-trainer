import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { VocabAssignment, VocabSessionWord, VocabWord } from '../models/vocab.model';

const DEFAULT_WORD_WEIGHT = 3;
const MAX_WORD_WEIGHT = 5;
const MIN_PHASE1_UNIQUE_WORDS = 8;
const ENGLISCH_LANGUAGE_NAME = 'Englisch';

@Injectable({ providedIn: 'root' })
export class EnglischService {
  private supabase = inject(SupabaseService);

  readonly assignments = signal<VocabAssignment[]>([]);
  readonly languageId = signal<string | null>(null);
  readonly speechLang = signal('en-GB');

  private wordProgressMap = signal<Record<string, number>>({});

  async ensureLanguage(): Promise<string | null> {
    const existing = this.languageId();
    if (existing) return existing;

    const lang = await this.supabase.getVocabLanguageByName(ENGLISCH_LANGUAGE_NAME);
    if (!lang) {
      console.error('[EnglischService] Englisch language row missing — run migration');
      return null;
    }
    this.languageId.set(lang.id);
    this.speechLang.set(lang.speech_lang || 'en-GB');
    return lang.id;
  }

  async loadUserData(userId: string): Promise<void> {
    try {
      const languageId = await this.ensureLanguage();
      const [assignments, progress] = await Promise.all([
        this.supabase.getVocabAssignmentsForUser(userId),
        this.supabase.getWordProgressForUser(userId),
      ]);

      const englischAssignments = assignments.filter(
        (a) => !!languageId && a.list?.language_id === languageId
      );
      this.assignments.set(englischAssignments);

      const progressMap: Record<string, number> = {};
      for (const p of progress) {
        progressMap[p.word_id] = p.weight;
      }
      this.wordProgressMap.set(progressMap);
    } catch (error) {
      console.error('[EnglischService] Failed to load user data:', error);
    }
  }

  clearUserData(): void {
    this.assignments.set([]);
    this.wordProgressMap.set({});
  }

  private toSessionWord(w: VocabWord, weight: number): VocabSessionWord | null {
    const promptEn = (w.prompt_en ?? w.word ?? '').trim();
    const answerDe = (w.answer_de ?? '').trim();
    if (!promptEn || !answerDe) return null;
    return {
      wordId: w.id,
      word: promptEn,
      listId: w.list_id,
      weight,
      promptEn,
      answerDe,
      contextEn: w.context_en ?? null,
    };
  }

  async buildSession(_userId: string): Promise<VocabSessionWord[]> {
    const sortedAssignments = [...this.assignments()].sort((a, b) => {
      const dateA = a.assigned_at ? new Date(a.assigned_at).getTime() : 0;
      const dateB = b.assigned_at ? new Date(b.assigned_at).getTime() : 0;
      return dateB - dateA;
    });

    if (sortedAssignments.length === 0) return [];

    const progressMap = this.wordProgressMap();
    const activeListId = sortedAssignments[0].list_id;
    const activeWords = await this.supabase.getVocabListWords(activeListId);

    const isPhase1 = activeWords.some(
      (w) => (progressMap[w.id] ?? DEFAULT_WORD_WEIGHT) > 1
    );

    const sessionWords: VocabSessionWord[] = [];

    if (isPhase1) {
      const fillers: VocabSessionWord[] = [];

      for (const w of activeWords) {
        const weight = Math.min(MAX_WORD_WEIGHT, progressMap[w.id] ?? DEFAULT_WORD_WEIGHT);
        const entry = this.toSessionWord(w, weight <= 1 ? 1 : weight);
        if (!entry) continue;
        if (weight > 1) {
          sessionWords.push(entry);
        } else {
          fillers.push(entry);
        }
      }

      for (const filler of fillers) {
        if (sessionWords.length >= MIN_PHASE1_UNIQUE_WORDS) break;
        sessionWords.push(filler);
      }
    } else {
      for (const w of activeWords) {
        const entry = this.toSessionWord(w, 1);
        if (entry) sessionWords.push(entry);
      }
      for (let i = 1; i < sortedAssignments.length; i++) {
        const words = await this.supabase.getVocabListWords(sortedAssignments[i].list_id);
        for (const w of words) {
          const weight = Math.min(MAX_WORD_WEIGHT, progressMap[w.id] ?? DEFAULT_WORD_WEIGHT);
          const entry = this.toSessionWord(w, weight);
          if (entry) sessionWords.push(entry);
        }
      }
    }

    return this.buildWeightedQueue(sessionWords);
  }

  private buildWeightedQueue(words: VocabSessionWord[]): VocabSessionWord[] {
    const queue: VocabSessionWord[] = [];
    for (const word of words) {
      for (let i = 0; i < word.weight; i++) {
        queue.push(word);
      }
    }
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    this.separateAdjacentDuplicates(queue);
    return queue;
  }

  private separateAdjacentDuplicates(queue: VocabSessionWord[]): void {
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].wordId !== queue[i - 1].wordId) continue;
      for (let j = i + 1; j < queue.length; j++) {
        if (queue[j].wordId !== queue[i - 1].wordId) {
          [queue[i], queue[j]] = [queue[j], queue[i]];
          break;
        }
      }
    }
  }

  async updateWordWeight(userId: string, wordId: string, correct: boolean): Promise<void> {
    const map = this.wordProgressMap();
    const current = map[wordId] ?? DEFAULT_WORD_WEIGHT;
    const newWeight = Math.min(MAX_WORD_WEIGHT, correct ? Math.max(1, current - 1) : current + 2);

    this.wordProgressMap.set({ ...map, [wordId]: newWeight });

    try {
      await this.supabase.upsertWordProgress(userId, wordId, newWeight);
    } catch (error) {
      console.error('[EnglischService] Failed to update word weight:', error);
    }
  }
}
