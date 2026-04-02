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

    it('should cap weight at 1 for non-active lists', async () => {
      mockSupabase.getVocabAssignmentsForUser.and.resolveTo([
        makeAssignment({ id: 'a1', list_id: 'list-1', assigned_at: '2025-01-02T00:00:00Z' }),
        makeAssignment({ id: 'a2', list_id: 'list-2', assigned_at: '2025-01-01T00:00:00Z' }),
      ]);
      mockSupabase.getWordProgressForUser.and.resolveTo([]);
      mockSupabase.getVocabListWords.and.callFake((listId: string) => {
        if (listId === 'list-1') return Promise.resolve([makeWord({ id: 'w1', list_id: 'list-1' })]);
        return Promise.resolve([makeWord({ id: 'w2', list_id: 'list-2' })]);
      });

      await service.loadUserData('user-1');
      const session = await service.buildSession('user-1');

      // Non-active list words should have weight capped at 1
      const w2Entries = session.filter((w) => w.wordId === 'w2');
      expect(w2Entries.length).toBe(1);

      // Active list words should use default weight 3
      const w1Entries = session.filter((w) => w.wordId === 'w1');
      expect(w1Entries.length).toBe(3);
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
  });
});
