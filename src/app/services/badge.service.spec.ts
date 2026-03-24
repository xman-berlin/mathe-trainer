import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BadgeService } from './badge.service';
import type { BadgeCheckData } from '../models/badge.model';

describe('BadgeService — Deutsch badges', () => {
  let service: BadgeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), BadgeService],
    });
    service = TestBed.inject(BadgeService);
  });

  function makeData(overrides: Partial<BadgeCheckData> = {}): BadgeCheckData {
    return {
      lifetimeStats: {},
      dailyStats: {},
      currentStreak: 0,
      longestStreak: 0,
      bestStreaksByType: {},
      timeTrialBests: [],
      masteredReihen: [],
      ...overrides,
    };
  }

  function check(badgeId: string, data: BadgeCheckData): boolean {
    const badge = service.getBadgeById(badgeId);
    if (!badge) throw new Error(`Badge ${badgeId} not found`);
    return badge.checkFunction(data);
  }

  // ─── Meilenstein (lifetime) ───────────────────────────────────────

  describe('deutsch-beginner (≥10)', () => {
    it('should NOT trigger at 9', () => {
      expect(check('deutsch-beginner', makeData({ lifetimeStats: { 'deutsch-rechtschreibung': 9 } }))).toBeFalse();
    });
    it('should trigger at 10', () => {
      expect(check('deutsch-beginner', makeData({ lifetimeStats: { 'deutsch-rechtschreibung': 10 } }))).toBeTrue();
    });
    it('should trigger at 50', () => {
      expect(check('deutsch-beginner', makeData({ lifetimeStats: { 'deutsch-rechtschreibung': 50 } }))).toBeTrue();
    });
    it('should NOT trigger without key', () => {
      expect(check('deutsch-beginner', makeData())).toBeFalse();
    });
  });

  describe('deutsch-apprentice (≥50)', () => {
    it('should NOT trigger at 49', () => {
      expect(check('deutsch-apprentice', makeData({ lifetimeStats: { 'deutsch-rechtschreibung': 49 } }))).toBeFalse();
    });
    it('should trigger at 50', () => {
      expect(check('deutsch-apprentice', makeData({ lifetimeStats: { 'deutsch-rechtschreibung': 50 } }))).toBeTrue();
    });
  });

  describe('deutsch-scholar (≥200)', () => {
    it('should NOT trigger at 199', () => {
      expect(check('deutsch-scholar', makeData({ lifetimeStats: { 'deutsch-rechtschreibung': 199 } }))).toBeFalse();
    });
    it('should trigger at 200', () => {
      expect(check('deutsch-scholar', makeData({ lifetimeStats: { 'deutsch-rechtschreibung': 200 } }))).toBeTrue();
    });
  });

  describe('deutsch-master (≥500)', () => {
    it('should NOT trigger at 499', () => {
      expect(check('deutsch-master', makeData({ lifetimeStats: { 'deutsch-rechtschreibung': 499 } }))).toBeFalse();
    });
    it('should trigger at 500', () => {
      expect(check('deutsch-master', makeData({ lifetimeStats: { 'deutsch-rechtschreibung': 500 } }))).toBeTrue();
    });
  });

  describe('deutsch-champion (≥1000)', () => {
    it('should NOT trigger at 999', () => {
      expect(check('deutsch-champion', makeData({ lifetimeStats: { 'deutsch-rechtschreibung': 999 } }))).toBeFalse();
    });
    it('should trigger at 1000', () => {
      expect(check('deutsch-champion', makeData({ lifetimeStats: { 'deutsch-rechtschreibung': 1000 } }))).toBeTrue();
    });
  });

  // ─── Tagesform (daily) ────────────────────────────────────────────

  describe('deutsch-daily-10 (≥10 correct today)', () => {
    it('should NOT trigger at 9 correct', () => {
      expect(check('deutsch-daily-10', makeData({
        dailyStats: { 'deutsch-rechtschreibung': { correct: 9, incorrect: 0 } },
      }))).toBeFalse();
    });
    it('should trigger at 10 correct (even with errors)', () => {
      expect(check('deutsch-daily-10', makeData({
        dailyStats: { 'deutsch-rechtschreibung': { correct: 10, incorrect: 5 } },
      }))).toBeTrue();
    });
    it('should NOT trigger without daily stats', () => {
      expect(check('deutsch-daily-10', makeData())).toBeFalse();
    });
  });

  describe('deutsch-perfect-day (≥20 correct, 0 errors)', () => {
    it('should NOT trigger at 20 correct with 1 error', () => {
      expect(check('deutsch-perfect-day', makeData({
        dailyStats: { 'deutsch-rechtschreibung': { correct: 20, incorrect: 1 } },
      }))).toBeFalse();
    });
    it('should NOT trigger at 19 correct with 0 errors', () => {
      expect(check('deutsch-perfect-day', makeData({
        dailyStats: { 'deutsch-rechtschreibung': { correct: 19, incorrect: 0 } },
      }))).toBeFalse();
    });
    it('should trigger at 20 correct with 0 errors', () => {
      expect(check('deutsch-perfect-day', makeData({
        dailyStats: { 'deutsch-rechtschreibung': { correct: 20, incorrect: 0 } },
      }))).toBeTrue();
    });
  });

  // ─── Serien (best streak) ─────────────────────────────────────────

  describe('deutsch-streak-10 (best streak ≥10)', () => {
    it('should NOT trigger at streak 9', () => {
      expect(check('deutsch-streak-10', makeData({
        bestStreaksByType: { 'deutsch-rechtschreibung': 9 },
      }))).toBeFalse();
    });
    it('should trigger at streak 10', () => {
      expect(check('deutsch-streak-10', makeData({
        bestStreaksByType: { 'deutsch-rechtschreibung': 10 },
      }))).toBeTrue();
    });
    it('should NOT trigger without streak key', () => {
      expect(check('deutsch-streak-10', makeData())).toBeFalse();
    });
  });

  describe('deutsch-streak-25 (best streak ≥25)', () => {
    it('should NOT trigger at streak 24', () => {
      expect(check('deutsch-streak-25', makeData({
        bestStreaksByType: { 'deutsch-rechtschreibung': 24 },
      }))).toBeFalse();
    });
    it('should trigger at streak 25', () => {
      expect(check('deutsch-streak-25', makeData({
        bestStreaksByType: { 'deutsch-rechtschreibung': 25 },
      }))).toBeTrue();
    });
  });
});
