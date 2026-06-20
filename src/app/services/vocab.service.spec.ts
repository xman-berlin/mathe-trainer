import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DeutschService } from './vocab.service';
import { SupabaseService } from './supabase.service';
import type { VocabAssignment, VocabWord, VocabWordProgress } from '../models/vocab.model';

function makeAssignment(overrides: Partial<VocabAssignment> = {}): VocabAssignment {
  return {
    id: 'assign-1',
    user_id: 'user-1',
    list_id: 'list-1',
    assigned_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeWord(overrides: Partial<VocabWord> = {}): VocabWord {
  return {
    id: 'word-1',
    list_id: 'list-1',
    word: 'Hund',
    ...overrides,
  };
}

function makeProgress(overrides: Partial<VocabWordProgress> = {}): VocabWordProgress {
  return {
    user_id: 'user-1',
    word_id: 'word-1',
    weight: 3,
    ...overrides,
  };
}

describe('DeutschService', () => {
  let service: DeutschService;
  let mockSupabase: jasmine.SpyObj<SupabaseService>;

  beforeEach(() => {
    mockSupabase = jasmine.createSpyObj('SupabaseService', [
      'getVocabAssignmentsForUser',
      'getWordProgressForUser',
      'getVocabListWords',
      'upsertWordProgress',
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        DeutschService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });

    service = TestBed.inject(DeutschService);
  });

  // ─── Initial State ──────────────────────────────────────────

  describe('initial state', () => {
    it('should start with empty assignments', () => {
      expect(service.assignments()).toEqual([]);
    });
  });

  // ─── loadUserData ───────────────────────────────────────────

  describe('loadUserData', () => {
    it('should load assignments from supabase', async () => {
      const assignments = [makeAssignment()];
      mockSupabase.getVocabAssignmentsForUser.and.resolveTo(assignments);
      mockSupabase.getWordProgressForUser.and.resolveTo([]);

      await service.loadUserData('user-1');
      expect(service.assignments().length).toBe(1);
      expect(service.assignments()[0].list_id).toBe('list-1');
    });

    it('should handle supabase error gracefully', async () => {
      mockSupabase.getVocabAssignmentsForUser.and.rejectWith(new Error('network'));
      mockSupabase.getWordProgressForUser.and.resolveTo([]);

      await expectAsync(service.loadUserData('user-1')).not.toBeRejected();
      expect(service.assignments()).toEqual([]);
    });
  });

  // ─── clearUserData ──────────────────────────────────────────

  describe('clearUserData', () => {
    it('should clear assignments', async () => {
      mockSupabase.getVocabAssignmentsForUser.and.resolveTo([makeAssignment()]);
      mockSupabase.getWordProgressForUser.and.resolveTo([]);

      await service.loadUserData('user-1');
      expect(service.assignments().length).toBe(1);

      service.clearUserData();
      expect(service.assignments()).toEqual([]);
    });
  });

  // ─── buildSession ───────────────────────────────────────────

  describe('buildSession', () => {
    it('should return empty array when no assignments', async () => {
      mockSupabase.getVocabAssignmentsForUser.and.resolveTo([]);
      mockSupabase.getWordProgressForUser.and.resolveTo([]);

      await service.loadUserData('user-1');
      const session = await service.buildSession('user-1');
      expect(session).toEqual([]);
    });

    it('should return words from assigned lists', async () => {
      mockSupabase.getVocabAssignmentsForUser.and.resolveTo([makeAssignment()]);
      mockSupabase.getWordProgressForUser.and.resolveTo([]);
      mockSupabase.getVocabListWords.and.resolveTo([
        makeWord({ id: 'w1', word: 'Hund' }),
        makeWord({ id: 'w2', word: 'Katze' }),
      ]);

      await service.loadUserData('user-1');
      const session = await service.buildSession('user-1');

      expect(session.length).toBeGreaterThan(0);
      const uniqueWords = new Set(session.map((w) => w.wordId));
      expect(uniqueWords.size).toBe(2);
    });

    it('should use default weight of 3 for unknown words', async () => {
      mockSupabase.getVocabAssignmentsForUser.and.resolveTo([makeAssignment()]);
      mockSupabase.getWordProgressForUser.and.resolveTo([]);
      mockSupabase.getVocabListWords.and.resolveTo([
        makeWord({ id: 'w1', word: 'Hund' }),
      ]);

      await service.loadUserData('user-1');
      const session = await service.buildSession('user-1');

      // Default weight 3 means word appears 3 times in queue
      const w1Entries = session.filter((w) => w.wordId === 'w1');
      expect(w1Entries.length).toBe(3);
    });

    it('should cap weight at 1 for non-active lists (Phase 2)', async () => {
      mockSupabase.getVocabAssignmentsForUser.and.resolveTo([
        makeAssignment({ id: 'a1', list_id: 'list-1', assigned_at: '2025-01-02T00:00:00Z' }),
        makeAssignment({ id: 'a2', list_id: 'list-2', assigned_at: '2025-01-01T00:00:00Z' }),
      ]);
      // Active list word at weight 1 → Phase 2
      mockSupabase.getWordProgressForUser.and.resolveTo([
        makeProgress({ word_id: 'w1', weight: 1 }),
      ]);
      mockSupabase.getVocabListWords.and.callFake((listId: string) => {
        if (listId === 'list-1') return Promise.resolve([makeWord({ id: 'w1', list_id: 'list-1' })]);
        return Promise.resolve([makeWord({ id: 'w2', list_id: 'list-2' })]);
      });

      await service.loadUserData('user-1');
      const session = await service.buildSession('user-1');

      // Active list word at weight 1 → appears once
      const w1Entries = session.filter((w) => w.wordId === 'w1');
      expect(w1Entries.length).toBe(1);

      // Old list word with default weight 3 → appears 3 times
      const w2Entries = session.filter((w) => w.wordId === 'w2');
      expect(w2Entries.length).toBe(3);
    });

    it('Phase 1: excludes words at weight 1 from session', async () => {
      mockSupabase.getVocabAssignmentsForUser.and.resolveTo([
        makeAssignment({ id: 'a1', list_id: 'list-1', assigned_at: '2025-01-02T00:00:00Z' }),
      ]);
      mockSupabase.getWordProgressForUser.and.resolveTo([
        makeProgress({ word_id: 'w1', weight: 1 }),
        makeProgress({ word_id: 'w2', weight: 3 }),
      ]);
      mockSupabase.getVocabListWords.and.resolveTo([
        makeWord({ id: 'w1', word: 'Hund' }),
        makeWord({ id: 'w2', word: 'Katze' }),
      ]);

      await service.loadUserData('user-1');
      const session = await service.buildSession('user-1');

      // w1 at weight 1 → excluded
      const w1Entries = session.filter((w) => w.wordId === 'w1');
      expect(w1Entries.length).toBe(0);

      // w2 at weight 3 → appears 3 times
      const w2Entries = session.filter((w) => w.wordId === 'w2');
      expect(w2Entries.length).toBe(3);
    });

    it('Phase 1: includes only active list when any active word weight > 1', async () => {
      mockSupabase.getVocabAssignmentsForUser.and.resolveTo([
        makeAssignment({ id: 'a1', list_id: 'list-1', assigned_at: '2025-01-02T00:00:00Z' }),
        makeAssignment({ id: 'a2', list_id: 'list-2', assigned_at: '2025-01-01T00:00:00Z' }),
      ]);
      // Active list word still at weight 3 → Phase 1
      mockSupabase.getWordProgressForUser.and.resolveTo([]);
      mockSupabase.getVocabListWords.and.callFake((listId: string) => {
        if (listId === 'list-1') return Promise.resolve([makeWord({ id: 'w1', list_id: 'list-1' })]);
        return Promise.resolve([makeWord({ id: 'w2', list_id: 'list-2' })]);
      });

      await service.loadUserData('user-1');
      const session = await service.buildSession('user-1');

      // Old list word must not appear in Phase 1
      const w2Entries = session.filter((w) => w.wordId === 'w2');
      expect(w2Entries.length).toBe(0);

      // Active list word appears (default weight 3)
      const w1Entries = session.filter((w) => w.wordId === 'w1');
      expect(w1Entries.length).toBe(3);
    });

    it('Phase 2: includes all lists when all active words at weight 1', async () => {
      mockSupabase.getVocabAssignmentsForUser.and.resolveTo([
        makeAssignment({ id: 'a1', list_id: 'list-1', assigned_at: '2025-01-02T00:00:00Z' }),
        makeAssignment({ id: 'a2', list_id: 'list-2', assigned_at: '2025-01-01T00:00:00Z' }),
      ]);
      mockSupabase.getWordProgressForUser.and.resolveTo([
        makeProgress({ word_id: 'w1', weight: 1 }),
      ]);
      mockSupabase.getVocabListWords.and.callFake((listId: string) => {
        if (listId === 'list-1') return Promise.resolve([makeWord({ id: 'w1', list_id: 'list-1' })]);
        return Promise.resolve([makeWord({ id: 'w2', list_id: 'list-2' })]);
      });

      await service.loadUserData('user-1');
      const session = await service.buildSession('user-1');

      // Both words must appear
      const wordIds = new Set(session.map((w) => w.wordId));
      expect(wordIds.has('w1')).toBeTrue();
      expect(wordIds.has('w2')).toBeTrue();
    });

    it('should cap weight at 5 for high-weight active words', async () => {
      mockSupabase.getVocabAssignmentsForUser.and.resolveTo([makeAssignment()]);
      mockSupabase.getWordProgressForUser.and.resolveTo([
        makeProgress({ word_id: 'w1', weight: 20 }),
      ]);
      mockSupabase.getVocabListWords.and.resolveTo([makeWord({ id: 'w1' })]);

      await service.loadUserData('user-1');
      const session = await service.buildSession('user-1');

      // Weight 20 → capped at 5
      const w1Entries = session.filter((w) => w.wordId === 'w1');
      expect(w1Entries.length).toBe(5);
    });
  });

  // ─── updateWordWeight ───────────────────────────────────────

  describe('updateWordWeight', () => {
    it('should decrease weight on correct answer (min 1)', async () => {
      mockSupabase.getVocabAssignmentsForUser.and.resolveTo([]);
      mockSupabase.getWordProgressForUser.and.resolveTo([]);
      mockSupabase.upsertWordProgress.and.resolveTo();

      await service.loadUserData('user-1');
      await service.updateWordWeight('user-1', 'word-1', true);

      expect(mockSupabase.upsertWordProgress).toHaveBeenCalledWith('user-1', 'word-1', 2);
    });

    it('should not go below weight 1', async () => {
      mockSupabase.getVocabAssignmentsForUser.and.resolveTo([]);
      mockSupabase.getWordProgressForUser.and.resolveTo([
        makeProgress({ word_id: 'word-1', weight: 1 }),
      ]);
      mockSupabase.upsertWordProgress.and.resolveTo();

      await service.loadUserData('user-1');
      await service.updateWordWeight('user-1', 'word-1', true);

      expect(mockSupabase.upsertWordProgress).toHaveBeenCalledWith('user-1', 'word-1', 1);
    });

    it('should increase weight by 2 on incorrect answer', async () => {
      mockSupabase.getVocabAssignmentsForUser.and.resolveTo([]);
      mockSupabase.getWordProgressForUser.and.resolveTo([]);
      mockSupabase.upsertWordProgress.and.resolveTo();

      await service.loadUserData('user-1');
      await service.updateWordWeight('user-1', 'word-1', false);

      expect(mockSupabase.upsertWordProgress).toHaveBeenCalledWith('user-1', 'word-1', 5);
    });

    it('should cap stored weight at 5', async () => {
      mockSupabase.getVocabAssignmentsForUser.and.resolveTo([]);
      mockSupabase.getWordProgressForUser.and.resolveTo([
        makeProgress({ word_id: 'word-1', weight: 20 }),
      ]);
      mockSupabase.upsertWordProgress.and.resolveTo();

      await service.loadUserData('user-1');
      await service.updateWordWeight('user-1', 'word-1', true);

      // weight 20 → correct → max(1, 20-1)=19 → capped at 5
      expect(mockSupabase.upsertWordProgress).toHaveBeenCalledWith('user-1', 'word-1', 5);
    });

    it('should cap stored weight at 5 on incorrect answer', async () => {
      mockSupabase.getVocabAssignmentsForUser.and.resolveTo([]);
      mockSupabase.getWordProgressForUser.and.resolveTo([
        makeProgress({ word_id: 'word-1', weight: 4 }),
      ]);
      mockSupabase.upsertWordProgress.and.resolveTo();

      await service.loadUserData('user-1');
      await service.updateWordWeight('user-1', 'word-1', false);

      // weight 4 → wrong → 4+2=6 → capped at 5
      expect(mockSupabase.upsertWordProgress).toHaveBeenCalledWith('user-1', 'word-1', 5);
    });
  });
});
