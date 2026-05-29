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

describe('BadgeService — Vor/Nach clock badges', () => {
  let service: BadgeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), BadgeService],
    });
    service = TestBed.inject(BadgeService);
  });

  function makeData(lifetimeStats: Record<string, number>): BadgeCheckData {
    return {
      lifetimeStats,
      dailyStats: {},
      currentStreak: 0,
      longestStreak: 0,
      bestStreaksByType: {},
      timeTrialBests: [],
      masteredReihen: [],
    };
  }

  function check(badgeId: string, data: BadgeCheckData): boolean {
    const badge = service.getBadgeById(badgeId);
    if (!badge) throw new Error(`Badge ${badgeId} not found`);
    return badge.checkFunction(data);
  }

  describe('vor-nach-beginner (≥25 combined)', () => {
    it('should NOT trigger at 24', () => {
      expect(check('vor-nach-beginner', makeData({
        'clock-setClock-fiveMinAfter': 10,
        'clock-setClock-fiveMinBefore': 10,
        'clock-setClock-fiveMinHalf': 4,
      }))).toBeFalse();
    });
    it('should trigger at 25', () => {
      expect(check('vor-nach-beginner', makeData({
        'clock-setClock-fiveMinAfter': 10,
        'clock-setClock-fiveMinBefore': 10,
        'clock-setClock-fiveMinHalf': 5,
      }))).toBeTrue();
    });
    it('should trigger with only one type', () => {
      expect(check('vor-nach-beginner', makeData({
        'clock-setClock-fiveMinAfter': 25,
      }))).toBeTrue();
    });
  });

  describe('vor-nach-expert (≥100 combined)', () => {
    it('should NOT trigger at 99', () => {
      expect(check('vor-nach-expert', makeData({
        'clock-setClock-fiveMinAfter': 99,
      }))).toBeFalse();
    });
    it('should trigger at 100', () => {
      expect(check('vor-nach-expert', makeData({
        'clock-setClock-fiveMinAfter': 40,
        'clock-setClock-fiveMinBefore': 40,
        'clock-setClock-fiveMinHalf': 20,
      }))).toBeTrue();
    });
  });

  describe('clock-all-types (all 7 setClock types ≥100 each)', () => {
    const allTypes = {
      'clock-setClock-full': 100,
      'clock-setClock-half': 100,
      'clock-setClock-quarter': 100,
      'clock-setClock-fiveMin': 100,
      'clock-setClock-fiveMinAfter': 100,
      'clock-setClock-fiveMinBefore': 100,
      'clock-setClock-fiveMinHalf': 100,
    };

    it('should NOT trigger when one type is missing', () => {
      const partial = { ...allTypes, 'clock-setClock-fiveMinHalf': 99 };
      expect(check('clock-all-types', makeData(partial))).toBeFalse();
    });
    it('should trigger when all 7 types have ≥100', () => {
      expect(check('clock-all-types', makeData(allTypes))).toBeTrue();
    });
    it('should trigger with more than 100', () => {
      const over = { ...allTypes, 'clock-setClock-fiveMinAfter': 150 };
      expect(check('clock-all-types', makeData(over))).toBeTrue();
    });
  });
});
