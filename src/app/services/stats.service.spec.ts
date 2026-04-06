import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StatsService } from './stats.service';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { DailyStreakService } from './daily-streak.service';
import { CoinsService } from './coins.service';
import { BadgeService } from './badge.service';

describe('StatsService', () => {
  let service: StatsService;
  let mockSupabase: jasmine.SpyObj<SupabaseService>;
  let mockAuthService: { currentUser: ReturnType<typeof signal>; isAuthenticated: () => boolean };
  let mockStreakService: jasmine.SpyObj<DailyStreakService>;
  let mockCoinsService: jasmine.SpyObj<CoinsService>;
  let mockBadgeService: jasmine.SpyObj<BadgeService>;

  beforeEach(() => {
    mockSupabase = jasmine.createSpyObj('SupabaseService', [
      'getDailyStats',
      'upsertDailyStats',
      'getLifetimeStats',
      'upsertLifetimeStats',
      'getMastery',
      'getPersonalBests',
      'getDailyStreak',
    ]);

    const currentUserSignal = signal<{ id: string; username: string; avatar_style: string; created_at: string; last_active_at: string } | null>(null);
    mockAuthService = {
      currentUser: currentUserSignal,
      isAuthenticated: () => currentUserSignal() !== null,
    };

    mockStreakService = jasmine.createSpyObj('DailyStreakService', ['recordPractice']);
    mockCoinsService = jasmine.createSpyObj('CoinsService', ['awardCoins']);
    mockBadgeService = jasmine.createSpyObj('BadgeService', ['checkAndAwardBadges']);

    // Mock localStorage
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');
    spyOn(localStorage, 'removeItem');

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        StatsService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DailyStreakService, useValue: mockStreakService },
        { provide: CoinsService, useValue: mockCoinsService },
        { provide: BadgeService, useValue: mockBadgeService },
      ],
    });

    service = TestBed.inject(StatsService);
  });

  // ─── recordResult ───────────────────────────────────────────

  describe('recordResult', () => {
    it('should track correct answers by type', () => {
      service.recordResult(true, 'addition');
      expect(service.statsByType()['addition']).toEqual({ correct: 1, incorrect: 0 });
    });

    it('should track incorrect answers by type', () => {
      service.recordResult(false, 'subtraction');
      expect(service.statsByType()['subtraction']).toEqual({ correct: 0, incorrect: 1 });
    });

    it('should accumulate correct answers', () => {
      service.recordResult(true, 'addition');
      service.recordResult(true, 'addition');
      service.recordResult(true, 'addition');
      expect(service.statsByType()['addition'].correct).toBe(3);
    });

    it('should accumulate incorrect answers', () => {
      service.recordResult(false, 'multiplication');
      service.recordResult(false, 'multiplication');
      expect(service.statsByType()['multiplication'].incorrect).toBe(2);
    });

    it('should track multiple exercise types independently', () => {
      service.recordResult(true, 'addition');
      service.recordResult(false, 'division');
      expect(service.statsByType()['addition'].correct).toBe(1);
      expect(service.statsByType()['division'].incorrect).toBe(1);
    });

    it('should update lifetime stats on correct answer', () => {
      service.recordResult(true, 'addition');
      service.recordResult(true, 'addition');
      expect(service.lifetimeStatsByType()['addition']).toBe(2);
    });

    it('should not update lifetime stats on incorrect answer', () => {
      service.recordResult(false, 'addition');
      expect(service.lifetimeStatsByType()['addition']).toBeUndefined();
    });

    it('should default exercise type to addition', () => {
      service.recordResult(true);
      expect(service.statsByType()['addition']).toBeDefined();
    });

    it('should call streak service on correct answer', () => {
      mockAuthService.currentUser.set({ id: 'user-1', username: 'test', avatar_style: 'a', created_at: '', last_active_at: '' });
      mockStreakService.recordPractice.and.resolveTo();
      service.recordResult(true, 'addition');
      expect(mockStreakService.recordPractice).toHaveBeenCalledWith('user-1');
    });
  });

  // ─── Math Stats ─────────────────────────────────────────────

  describe('math stats', () => {
    it('should compute mathCorrectCount from all math types', () => {
      service.recordResult(true, 'addition');
      service.recordResult(true, 'subtraction');
      service.recordResult(true, 'multiplication');
      service.recordResult(true, 'division');
      service.recordResult(true, 'word-problems');
      expect(service.mathCorrectCount()).toBe(5);
    });

    it('should compute mathIncorrectCount from all math types', () => {
      service.recordResult(false, 'addition');
      service.recordResult(false, 'addition');
      service.recordResult(false, 'subtraction');
      service.recordResult(false, 'multiplication');
      expect(service.mathIncorrectCount()).toBe(4);
    });

    it('should aggregate mixed correct and incorrect', () => {
      service.recordResult(true, 'addition');
      service.recordResult(false, 'addition');
      service.recordResult(true, 'subtraction');
      service.recordResult(false, 'subtraction');
      service.recordResult(false, 'subtraction');
      expect(service.mathCorrectCount()).toBe(2);
      expect(service.mathIncorrectCount()).toBe(3);
    });

    it('should not count non-math types in mathCorrectCount', () => {
      service.recordResult(true, 'clock-full');
      expect(service.mathCorrectCount()).toBe(0);
    });

    it('should compute goalProgressPercent', () => {
      for (let i = 0; i < 10; i++) {
        service.recordResult(true, 'addition');
      }
      // Default goal is 20, so 10/20 = 50%
      expect(service.goalProgressPercent()).toBe(50);
    });

    it('should cap goalProgressPercent at 100', () => {
      for (let i = 0; i < 30; i++) {
        service.recordResult(true, 'addition');
      }
      expect(service.goalProgressPercent()).toBe(100);
    });

    it('should detect when goal is reached', () => {
      for (let i = 0; i < 20; i++) {
        service.recordResult(true, 'addition');
      }
      expect(service.isGoalReached()).toBeTrue();
    });

    it('should not detect goal reached when below', () => {
      for (let i = 0; i < 19; i++) {
        service.recordResult(true, 'addition');
      }
      expect(service.isGoalReached()).toBeFalse();
    });
  });

  // ─── Clock Stats ────────────────────────────────────────────

  describe('clock stats', () => {
    it('should compute clockCorrectCount', () => {
      service.recordResult(true, 'clock-full');
      service.recordResult(true, 'clock-half');
      expect(service.clockCorrectCount()).toBe(2);
    });

    it('should compute clockIncorrectCount from all clock types', () => {
      service.recordResult(false, 'clock-full');
      service.recordResult(false, 'clock-half');
      service.recordResult(false, 'clock-quarter');
      expect(service.clockIncorrectCount()).toBe(3);
    });

    it('should aggregate mixed correct and incorrect for clock', () => {
      service.recordResult(true, 'clock-full');
      service.recordResult(false, 'clock-full');
      service.recordResult(true, 'clock-half');
      service.recordResult(false, 'clock-half');
      service.recordResult(false, 'clock-quarter');
      expect(service.clockCorrectCount()).toBe(2);
      expect(service.clockIncorrectCount()).toBe(3);
    });

    it('should detect clock goal reached', () => {
      for (let i = 0; i < 20; i++) {
        service.recordResult(true, 'clock-full');
      }
      expect(service.isClockGoalReached()).toBeTrue();
    });
  });

  // ─── Deutsch Stats ──────────────────────────────────────────

  describe('deutsch stats', () => {
    it('should aggregate all deutsch- types for correct count', () => {
      service.recordResult(true, 'deutsch-rechtschreibung');
      service.recordResult(true, 'deutsch-hangman');
      expect(service.deutschCorrectCount()).toBe(2);
    });

    it('should aggregate all deutsch- types for incorrect count', () => {
      service.recordResult(false, 'deutsch-rechtschreibung');
      service.recordResult(false, 'deutsch-rechtschreibung');
      service.recordResult(false, 'deutsch-hangman');
      expect(service.deutschIncorrectCount()).toBe(3);
    });

    it('should aggregate mixed correct and incorrect for deutsch', () => {
      service.recordResult(true, 'deutsch-rechtschreibung');
      service.recordResult(false, 'deutsch-rechtschreibung');
      service.recordResult(false, 'deutsch-rechtschreibung');
      service.recordResult(true, 'deutsch-hangman');
      service.recordResult(false, 'deutsch-hangman');
      expect(service.deutschCorrectCount()).toBe(2);
      expect(service.deutschIncorrectCount()).toBe(3);
    });

    it('should detect deutsch goal reached', () => {
      for (let i = 0; i < 10; i++) {
        service.recordResult(true, 'deutsch-rechtschreibung');
      }
      expect(service.isDeutschGoalReached()).toBeTrue();
    });
  });

  // ─── Daily Goal ─────────────────────────────────────────────

  describe('daily goals', () => {
    it('should set math daily goal', () => {
      service.setDailyGoal(50);
      expect(service.currentGoal()).toBe(50);
    });

    it('should clamp math goal min to 1', () => {
      service.setDailyGoal(0);
      expect(service.currentGoal()).toBe(1);
    });

    it('should clamp math goal max to 100', () => {
      service.setDailyGoal(200);
      expect(service.currentGoal()).toBe(100);
    });

    it('should set clock daily goal', () => {
      service.setClockDailyGoal(30);
      expect(service.currentClockGoal()).toBe(30);
    });

    it('should set deutsch daily goal', () => {
      service.setDeutschDailyGoal(15);
      expect(service.currentDeutschGoal()).toBe(15);
    });
  });

  // ─── Medal System ───────────────────────────────────────────

  describe('medal system', () => {
    it('should return none for 0 lifetime correct', () => {
      expect(service.getMedalLevel('addition')).toBe('none');
    });

    it('should return bronze at 100', () => {
      for (let i = 0; i < 100; i++) {
        service.recordResult(true, 'addition');
      }
      expect(service.getMedalLevel('addition')).toBe('bronze');
    });

    it('should return silver at 500', () => {
      for (let i = 0; i < 500; i++) {
        service.recordResult(true, 'addition');
      }
      expect(service.getMedalLevel('addition')).toBe('silver');
    });

    it('should return gold at 1000', () => {
      for (let i = 0; i < 1000; i++) {
        service.recordResult(true, 'addition');
      }
      expect(service.getMedalLevel('addition')).toBe('gold');
    });
  });

  // ─── Best Streaks ───────────────────────────────────────────

  describe('best streaks', () => {
    it('should return 0 for unset streak', () => {
      expect(service.getBestStreak('addition')).toBe(0);
    });

    it('should update best streak', () => {
      service.updateBestStreak('addition', 5);
      expect(service.getBestStreak('addition')).toBe(5);
    });

    it('should not lower best streak', () => {
      service.updateBestStreak('addition', 10);
      service.updateBestStreak('addition', 3);
      expect(service.getBestStreak('addition')).toBe(10);
    });
  });

  // ─── clearUserData ──────────────────────────────────────────

  describe('clearUserData', () => {
    it('should reset all state', () => {
      service.recordResult(true, 'addition');
      service.recordResult(true, 'addition');
      service.clearUserData();
      expect(Object.keys(service.statsByType()).length).toBe(0);
      expect(service.mathCorrectCount()).toBe(0);
      expect(service.currentGoal()).toBe(20);
    });
  });
});
