import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AchievementsService } from './achievements.service';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

describe('AchievementsService', () => {
  let service: AchievementsService;
  let mockSupabase: jasmine.SpyObj<SupabaseService>;
  let mockAuth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    mockSupabase = jasmine.createSpyObj('SupabaseService', [
      'getMastery',
      'upsertMastery',
    ]);
    mockAuth = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'currentUser']);

    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');

    mockAuth.isAuthenticated.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AchievementsService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: AuthService, useValue: mockAuth },
      ],
    });

    service = TestBed.inject(AchievementsService);
  });

  // ─── Initial State ──────────────────────────────────────────

  describe('initial state', () => {
    it('should have empty mastered reihen', () => {
      expect(service.masteredReihen()).toEqual([]);
    });

    it('should have totalMastered 0', () => {
      expect(service.totalMastered()).toBe(0);
    });

    it('should return default mastery for unknown reihe', () => {
      const mastery = service.getMastery(5);
      expect(mastery.currentStreak).toBe(0);
      expect(mastery.mastered).toBeFalse();
    });
  });

  // ─── recordMultiplicationResult ─────────────────────────────

  describe('recordMultiplicationResult', () => {
    it('should increment streak on correct answer', () => {
      service.recordMultiplicationResult(5, true);
      expect(service.getMastery(5).currentStreak).toBe(1);
    });

    it('should increment streak multiple times', () => {
      service.recordMultiplicationResult(5, true);
      service.recordMultiplicationResult(5, true);
      service.recordMultiplicationResult(5, true);
      expect(service.getMastery(5).currentStreak).toBe(3);
    });

    it('should reset streak on incorrect answer', () => {
      service.recordMultiplicationResult(5, true);
      service.recordMultiplicationResult(5, true);
      service.recordMultiplicationResult(5, false);
      expect(service.getMastery(5).currentStreak).toBe(0);
    });

    it('should mark as mastered at 10 correct in a row', () => {
      for (let i = 0; i < 9; i++) {
        service.recordMultiplicationResult(5, true);
      }
      expect(service.getMastery(5).mastered).toBeFalse();

      service.recordMultiplicationResult(5, true);
      expect(service.getMastery(5).mastered).toBeTrue();
    });

    it('should not lose mastery after incorrect answer', () => {
      for (let i = 0; i < 10; i++) {
        service.recordMultiplicationResult(5, true);
      }
      expect(service.getMastery(5).mastered).toBeTrue();

      service.recordMultiplicationResult(5, false);
      expect(service.getMastery(5).mastered).toBeTrue();
      expect(service.getMastery(5).currentStreak).toBe(0);
    });

    it('should track masteredAt timestamp on mastery', () => {
      for (let i = 0; i < 10; i++) {
        service.recordMultiplicationResult(5, true);
      }
      expect(service.getMastery(5).masteredAt).toBeTruthy();
    });

    it('should track different reihen independently', () => {
      for (let i = 0; i < 10; i++) {
        service.recordMultiplicationResult(5, true);
      }
      service.recordMultiplicationResult(7, true);

      expect(service.getMastery(5).mastered).toBeTrue();
      expect(service.getMastery(7).mastered).toBeFalse();
      expect(service.getMastery(7).currentStreak).toBe(1);
    });

    it('should persist to localStorage', () => {
      service.recordMultiplicationResult(5, true);
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  // ─── masteredReihen ─────────────────────────────────────────

  describe('masteredReihen computed', () => {
    it('should return sorted list of mastered reihen', () => {
      for (let i = 0; i < 10; i++) {
        service.recordMultiplicationResult(7, true);
        service.recordMultiplicationResult(3, true);
      }
      expect(service.masteredReihen()).toEqual([3, 7]);
    });

    it('should not include non-mastered reihen', () => {
      for (let i = 0; i < 10; i++) {
        service.recordMultiplicationResult(5, true);
      }
      service.recordMultiplicationResult(7, true);

      expect(service.masteredReihen()).toEqual([5]);
    });
  });

  // ─── totalMastered ──────────────────────────────────────────

  describe('totalMastered computed', () => {
    it('should count mastered reihen', () => {
      for (let i = 0; i < 10; i++) {
        service.recordMultiplicationResult(5, true);
      }
      expect(service.totalMastered()).toBe(1);
    });
  });

  // ─── loadFromServer ─────────────────────────────────────────

  describe('loadFromServer', () => {
    it('should load mastery from server', async () => {
      mockSupabase.getMastery.and.resolveTo([
        { reihe: 5, current_streak: 8, mastered: false, mastered_at: null },
        { reihe: 7, current_streak: 10, mastered: true, mastered_at: '2025-01-01T00:00:00Z' },
      ]);

      await service.loadFromServer('user-1');
      expect(service.getMastery(5).currentStreak).toBe(8);
      expect(service.getMastery(7).mastered).toBeTrue();
      expect(service.totalMastered()).toBe(1);
    });

    it('should persist loaded data to localStorage', async () => {
      mockSupabase.getMastery.and.resolveTo([
        { reihe: 5, current_streak: 8, mastered: false },
      ]);

      await service.loadFromServer('user-1');
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should not throw on server error', async () => {
      mockSupabase.getMastery.and.rejectWith(new Error('network'));
      await expectAsync(service.loadFromServer('user-1')).not.toBeRejected();
    });
  });

  // ─── clearUserData ──────────────────────────────────────────

  describe('clearUserData', () => {
    it('should clear all mastery data', () => {
      for (let i = 0; i < 10; i++) {
        service.recordMultiplicationResult(5, true);
      }
      expect(service.totalMastered()).toBe(1);

      service.clearUserData();
      expect(service.totalMastered()).toBe(0);
      expect(service.getMastery(5).currentStreak).toBe(0);
    });

    it('should remove from localStorage', () => {
      spyOn(localStorage, 'removeItem');
      service.clearUserData();
      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });
});
