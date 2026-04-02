import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TimedChallengeService, type TimeTrialResult } from './timed-challenge.service';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

describe('TimedChallengeService', () => {
  let service: TimedChallengeService;
  let mockSupabase: jasmine.SpyObj<SupabaseService>;
  let mockAuth: jasmine.SpyObj<AuthService>;

  function makeResult(overrides: Partial<TimeTrialResult> = {}): TimeTrialResult {
    return {
      exerciseTypes: ['addition'],
      correctCount: 8,
      totalCount: 10,
      accuracy: 80,
      completedAt: '2025-01-01T00:00:00Z',
      ...overrides,
    };
  }

  beforeEach(() => {
    mockSupabase = jasmine.createSpyObj('SupabaseService', [
      'getPersonalBests',
      'upsertPersonalBest',
    ]);
    mockAuth = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'currentUser']);

    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');
    spyOn(localStorage, 'removeItem');

    mockAuth.isAuthenticated.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TimedChallengeService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: AuthService, useValue: mockAuth },
      ],
    });

    service = TestBed.inject(TimedChallengeService);
  });

  // ─── Initial State ──────────────────────────────────────────

  describe('initial state', () => {
    it('should return null for unknown type combination', () => {
      expect(service.getBestForTypes(['addition'])).toBeNull();
    });
  });

  // ─── recordResult ───────────────────────────────────────────

  describe('recordResult', () => {
    it('should return true for first result (new best)', () => {
      const result = service.recordResult(makeResult());
      expect(result).toBeTrue();
    });

    it('should store the best result', () => {
      service.recordResult(makeResult({ correctCount: 5 }));
      const best = service.getBestForTypes(['addition']);
      expect(best).not.toBeNull();
      expect(best!.correctCount).toBe(5);
    });

    it('should return true when new result beats old best', () => {
      service.recordResult(makeResult({ correctCount: 5 }));
      const result = service.recordResult(makeResult({ correctCount: 8 }));
      expect(result).toBeTrue();
    });

    it('should return false when new result does not beat old best', () => {
      service.recordResult(makeResult({ correctCount: 8 }));
      const result = service.recordResult(makeResult({ correctCount: 5 }));
      expect(result).toBeFalse();
    });

    it('should keep old best when new result is lower', () => {
      service.recordResult(makeResult({ correctCount: 8 }));
      service.recordResult(makeResult({ correctCount: 5 }));
      const best = service.getBestForTypes(['addition']);
      expect(best!.correctCount).toBe(8);
    });

    it('should persist to localStorage', () => {
      service.recordResult(makeResult());
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should handle different exercise type combinations independently', () => {
      service.recordResult(makeResult({ exerciseTypes: ['addition'], correctCount: 5 }));
      service.recordResult(makeResult({ exerciseTypes: ['subtraction'], correctCount: 8 }));

      expect(service.getBestForTypes(['addition'])!.correctCount).toBe(5);
      expect(service.getBestForTypes(['subtraction'])!.correctCount).toBe(8);
    });

    it('should sort exercise types for key', () => {
      service.recordResult(makeResult({ exerciseTypes: ['subtraction', 'addition'], correctCount: 7 }));
      const best = service.getBestForTypes(['addition', 'subtraction']);
      expect(best).not.toBeNull();
      expect(best!.correctCount).toBe(7);
    });
  });

  // ─── loadFromServer ─────────────────────────────────────────

  describe('loadFromServer', () => {
    it('should load personal bests from server', async () => {
      mockSupabase.getPersonalBests.and.resolveTo([
        {
          exercise_types: ['addition'],
          correct_count: 10,
          total_count: 10,
          accuracy: 100,
          achieved_at: '2025-01-01T00:00:00Z',
        },
      ]);

      await service.loadFromServer('user-1');
      const best = service.getBestForTypes(['addition']);
      expect(best).not.toBeNull();
      expect(best!.correctCount).toBe(10);
    });

    it('should persist loaded data to localStorage', async () => {
      mockSupabase.getPersonalBests.and.resolveTo([
        {
          exercise_types: ['addition'],
          correct_count: 10,
          total_count: 10,
          accuracy: 100,
        },
      ]);

      await service.loadFromServer('user-1');
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should not throw on server error', async () => {
      mockSupabase.getPersonalBests.and.rejectWith(new Error('network'));
      await expectAsync(service.loadFromServer('user-1')).not.toBeRejected();
    });
  });

  // ─── clearUserData ──────────────────────────────────────────

  describe('clearUserData', () => {
    it('should clear personal bests', () => {
      service.recordResult(makeResult());
      expect(service.getBestForTypes(['addition'])).not.toBeNull();

      service.clearUserData();
      expect(service.getBestForTypes(['addition'])).toBeNull();
    });

    it('should remove from localStorage', () => {
      service.clearUserData();
      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });
});
