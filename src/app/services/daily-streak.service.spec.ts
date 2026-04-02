import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DailyStreakService } from './daily-streak.service';
import { SupabaseService } from './supabase.service';
import { CoinsService } from './coins.service';
import type { DailyStreak } from '../models/daily-streak.model';

function makeStreak(overrides: Partial<DailyStreak> = {}): DailyStreak {
  return {
    user_id: 'user-1',
    current_streak: 0,
    longest_streak: 0,
    last_practice_date: null,
    streak_milestones: [],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

describe('DailyStreakService', () => {
  let service: DailyStreakService;
  let mockSupabase: jasmine.SpyObj<SupabaseService>;
  let mockCoinsService: jasmine.SpyObj<CoinsService>;

  beforeEach(() => {
    mockSupabase = jasmine.createSpyObj('SupabaseService', [
      'getDailyStreak',
      'updateStreak',
    ]);
    mockCoinsService = jasmine.createSpyObj('CoinsService', ['awardCoins']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        DailyStreakService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: CoinsService, useValue: mockCoinsService },
      ],
    });

    service = TestBed.inject(DailyStreakService);
  });

  // ─── Computed Signals ───────────────────────────────────────

  describe('computed signals', () => {
    it('should default currentStreak to 0', () => {
      expect(service.currentStreak()).toBe(0);
    });

    it('should default longestStreak to 0', () => {
      expect(service.longestStreak()).toBe(0);
    });

    it('should derive currentStreak from streakData', () => {
      service.streakData.set(makeStreak({ current_streak: 5 }));
      expect(service.currentStreak()).toBe(5);
    });

    it('should derive longestStreak from streakData', () => {
      service.streakData.set(makeStreak({ longest_streak: 12 }));
      expect(service.longestStreak()).toBe(12);
    });

    it('should derive lastPracticeDate from streakData', () => {
      service.streakData.set(makeStreak({ last_practice_date: '2025-06-15' }));
      expect(service.lastPracticeDate()).toBe('2025-06-15');
    });
  });

  // ─── loadStreak ─────────────────────────────────────────────

  describe('loadStreak', () => {
    it('should load streak from supabase', async () => {
      const streak = makeStreak({ current_streak: 3 });
      mockSupabase.getDailyStreak.and.resolveTo(streak);
      await service.loadStreak('user-1');
      expect(service.currentStreak()).toBe(3);
    });

    it('should handle errors gracefully', async () => {
      mockSupabase.getDailyStreak.and.rejectWith(new Error('network'));
      await expectAsync(service.loadStreak('user-1')).not.toBeRejected();
    });
  });

  // ─── recordPractice ─────────────────────────────────────────

  describe('recordPractice', () => {
    it('should set streak to 1 on first ever practice', async () => {
      service.streakData.set(makeStreak({ last_practice_date: null }));
      mockSupabase.updateStreak.and.resolveTo();
      await service.recordPractice('user-1');
      expect(service.currentStreak()).toBe(1);
    });

    it('should increment streak on consecutive day', async () => {
      service.streakData.set(makeStreak({
        current_streak: 3,
        last_practice_date: daysAgo(1),
      }));
      mockSupabase.updateStreak.and.resolveTo();
      await service.recordPractice('user-1');
      expect(service.currentStreak()).toBe(4);
    });

    it('should not increment if already practiced today', async () => {
      service.streakData.set(makeStreak({
        current_streak: 5,
        last_practice_date: todayString(),
      }));
      mockSupabase.updateStreak.and.resolveTo();
      await service.recordPractice('user-1');
      expect(service.currentStreak()).toBe(5);
      expect(mockSupabase.updateStreak).not.toHaveBeenCalled();
    });

    it('should maintain streak within grace period (1-3 days)', async () => {
      service.streakData.set(makeStreak({
        current_streak: 5,
        last_practice_date: daysAgo(2),
      }));
      mockSupabase.updateStreak.and.resolveTo();
      await service.recordPractice('user-1');
      expect(service.currentStreak()).toBe(5);
    });

    it('should reset streak after grace period exceeded', async () => {
      service.streakData.set(makeStreak({
        current_streak: 10,
        last_practice_date: daysAgo(5),
      }));
      mockSupabase.updateStreak.and.resolveTo();
      await service.recordPractice('user-1');
      expect(service.currentStreak()).toBe(1);
    });

    it('should update longestStreak when exceeded', async () => {
      service.streakData.set(makeStreak({
        current_streak: 4,
        longest_streak: 4,
        last_practice_date: daysAgo(1),
      }));
      mockSupabase.updateStreak.and.resolveTo();
      await service.recordPractice('user-1');
      expect(service.longestStreak()).toBe(5);
    });

    it('should not lower longestStreak', async () => {
      service.streakData.set(makeStreak({
        current_streak: 3,
        longest_streak: 10,
        last_practice_date: daysAgo(1),
      }));
      mockSupabase.updateStreak.and.resolveTo();
      await service.recordPractice('user-1');
      expect(service.longestStreak()).toBe(10);
    });

    it('should persist to supabase', async () => {
      service.streakData.set(makeStreak({ last_practice_date: null }));
      mockSupabase.updateStreak.and.resolveTo();
      await service.recordPractice('user-1');
      expect(mockSupabase.updateStreak).toHaveBeenCalled();
    });
  });

  // ─── Milestones ─────────────────────────────────────────────

  describe('milestones', () => {
    it('should detect achieved milestones', async () => {
      service.streakData.set(makeStreak({
        current_streak: 6,
        last_practice_date: daysAgo(1),
        streak_milestones: [],
      }));
      mockSupabase.updateStreak.and.resolveTo();
      await service.recordPractice('user-1');
      expect(service.achievedMilestones()).toContain(7);
    });

    it('should award coins on milestone achievement', async () => {
      service.streakData.set(makeStreak({
        current_streak: 6,
        last_practice_date: daysAgo(1),
        streak_milestones: [],
      }));
      mockSupabase.updateStreak.and.resolveTo();
      mockCoinsService.awardCoins.and.resolveTo();
      await service.recordPractice('user-1');
      expect(mockCoinsService.awardCoins).toHaveBeenCalledWith('user-1', 50, 'streak_milestone', '7');
    });
  });

  // ─── getNextMilestone ───────────────────────────────────────

  describe('getNextMilestone', () => {
    it('should return first milestone above current streak', () => {
      service.streakData.set(makeStreak({ current_streak: 3 }));
      expect(service.getNextMilestone()).toBe(7);
    });

    it('should return next milestone when at a milestone', () => {
      service.streakData.set(makeStreak({ current_streak: 7 }));
      expect(service.getNextMilestone()).toBe(14);
    });

    it('should return null when all milestones achieved', () => {
      service.streakData.set(makeStreak({ current_streak: 400 }));
      expect(service.getNextMilestone()).toBeNull();
    });
  });

  // ─── getDaysToNextMilestone ─────────────────────────────────

  describe('getDaysToNextMilestone', () => {
    it('should return days to next milestone', () => {
      service.streakData.set(makeStreak({ current_streak: 5 }));
      expect(service.getDaysToNextMilestone()).toBe(2);
    });

    it('should return null when no next milestone', () => {
      service.streakData.set(makeStreak({ current_streak: 400 }));
      expect(service.getDaysToNextMilestone()).toBeNull();
    });
  });

  // ─── isAtMilestone ──────────────────────────────────────────

  describe('isAtMilestone', () => {
    it('should return true at milestone', () => {
      service.streakData.set(makeStreak({ current_streak: 7 }));
      expect(service.isAtMilestone()).toBeTrue();
    });

    it('should return false between milestones', () => {
      service.streakData.set(makeStreak({ current_streak: 5 }));
      expect(service.isAtMilestone()).toBeFalse();
    });
  });

  // ─── checkAndUpdateStreak ───────────────────────────────────

  describe('checkAndUpdateStreak', () => {
    it('should reset streak to 0 when grace period exceeded', async () => {
      mockSupabase.getDailyStreak.and.resolveTo(makeStreak({
        current_streak: 10,
        longest_streak: 10,
        last_practice_date: daysAgo(5),
      }));
      mockSupabase.updateStreak.and.resolveTo();
      await service.checkAndUpdateStreak('user-1');
      expect(service.currentStreak()).toBe(0);
    });

    it('should not reset when within grace period', async () => {
      mockSupabase.getDailyStreak.and.resolveTo(makeStreak({
        current_streak: 5,
        longest_streak: 5,
        last_practice_date: daysAgo(2),
      }));
      await service.checkAndUpdateStreak('user-1');
      expect(service.currentStreak()).toBe(5);
      expect(mockSupabase.updateStreak).not.toHaveBeenCalled();
    });

    it('should fix corrupted state (practiced today, streak 0)', async () => {
      mockSupabase.getDailyStreak.and.resolveTo(makeStreak({
        current_streak: 0,
        longest_streak: 5,
        last_practice_date: todayString(),
      }));
      mockSupabase.updateStreak.and.resolveTo();
      await service.checkAndUpdateStreak('user-1');
      expect(service.currentStreak()).toBe(1);
    });
  });

  // ─── clearUserData ──────────────────────────────────────────

  describe('clearUserData', () => {
    it('should reset all state', () => {
      service.streakData.set(makeStreak({ current_streak: 10 }));
      service.clearUserData();
      expect(service.streakData()).toBeNull();
      expect(service.currentStreak()).toBe(0);
    });
  });
});
