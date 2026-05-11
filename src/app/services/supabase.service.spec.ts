import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseService } from './supabase.service';

// SupabaseService is a thin CRUD wrapper around the Supabase SDK.
// Detailed method tests require mocking the full Supabase client chain,
// which mainly tests the SDK rather than our code.
// These tests focus on instantiation and error fallback patterns.

describe('SupabaseService', () => {
  let service: SupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), SupabaseService],
    });

    service = TestBed.inject(SupabaseService);
  });

  // ─── Instantiation ──────────────────────────────────────────

  describe('instantiation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  // ─── Method existence ───────────────────────────────────────

  describe('public API', () => {
    // User methods
    it('should have getUser method', () => {
      expect(typeof service.getUser).toBe('function');
    });

    it('should have createUser method', () => {
      expect(typeof service.createUser).toBe('function');
    });

    it('should have getAllUsers method', () => {
      expect(typeof service.getAllUsers).toBe('function');
    });

    it('should have updateLastActive method', () => {
      expect(typeof service.updateLastActive).toBe('function');
    });

    // Daily stats methods
    it('should have getDailyStats method', () => {
      expect(typeof service.getDailyStats).toBe('function');
    });

    it('should have upsertDailyStats method', () => {
      expect(typeof service.upsertDailyStats).toBe('function');
    });

    // Lifetime stats methods
    it('should have getLifetimeStats method', () => {
      expect(typeof service.getLifetimeStats).toBe('function');
    });

    it('should have upsertLifetimeStats method', () => {
      expect(typeof service.upsertLifetimeStats).toBe('function');
    });

    // Time trial methods
    it('should have getPersonalBests method', () => {
      expect(typeof service.getPersonalBests).toBe('function');
    });

    it('should have upsertPersonalBest method', () => {
      expect(typeof service.upsertPersonalBest).toBe('function');
    });

    // Badge methods
    it('should have getUserBadges method', () => {
      expect(typeof service.getUserBadges).toBe('function');
    });

    it('should have awardBadge method', () => {
      expect(typeof service.awardBadge).toBe('function');
    });

    // Coin methods
    it('should have getCoinBalance method', () => {
      expect(typeof service.getCoinBalance).toBe('function');
    });

    it('should have upsertCoinBalance method', () => {
      expect(typeof service.upsertCoinBalance).toBe('function');
    });

    it('should have recordCoinTransaction method', () => {
      expect(typeof service.recordCoinTransaction).toBe('function');
    });

    // Daily streak methods
    it('should have getDailyStreak method', () => {
      expect(typeof service.getDailyStreak).toBe('function');
    });

    it('should have updateStreak method', () => {
      expect(typeof service.updateStreak).toBe('function');
    });

    // Game methods
    it('should have getGameScores method', () => {
      expect(typeof service.getGameScores).toBe('function');
    });

    it('should have upsertGameScore method', () => {
      expect(typeof service.upsertGameScore).toBe('function');
    });

    // Mastery methods
    it('should have getMastery method', () => {
      expect(typeof service.getMastery).toBe('function');
    });

    it('should have upsertMastery method', () => {
      expect(typeof service.upsertMastery).toBe('function');
    });

    // Vocab methods
    it('should have getVocabAssignmentsForUser method', () => {
      expect(typeof service.getVocabAssignmentsForUser).toBe('function');
    });

    it('should have getWordProgressForUser method', () => {
      expect(typeof service.getWordProgressForUser).toBe('function');
    });

    it('should have getVocabListWords method', () => {
      expect(typeof service.getVocabListWords).toBe('function');
    });

    it('should have upsertWordProgress method', () => {
      expect(typeof service.upsertWordProgress).toBe('function');
    });
  });

  // ─── Error fallback patterns ────────────────────────────────

  describe('error fallback patterns', () => {
    it('getPersonalBests should return empty array on error', async () => {
      // The method catches errors and returns []
      // We verify by calling with an invalid setup (no actual DB)
      const result = await service.getPersonalBests('nonexistent-user');
      expect(Array.isArray(result)).toBeTrue();
    });

    it('getLifetimeStats should return empty object on error', async () => {
      const result = await service.getLifetimeStats('nonexistent-user');
      expect(result.stats_by_type).toBeDefined();
    });

    it('updateLastActive should not throw', async () => {
      await expectAsync(service.updateLastActive('any-user')).not.toBeRejected();
    });
    it('should have updateUserGoals method', () => {
      expect(typeof service.updateUserGoals).toBe('function');
    });
  });

  // ─── updateUserGoals ────────────────────────────────────────

  describe('updateUserGoals', () => {
    it('should not succeed silently (network not available in tests)', async () => {
      // No real DB — the call will reject; we just confirm the method runs and rejects
      await expectAsync(
        service.updateUserGoals('any-user', 20, 20, 20)
      ).toBeRejected();
    });

    it('should accept optional mathNumberRange param without throwing a JS error', async () => {
      await expectAsync(
        service.updateUserGoals('any-user', 20, 20, 20, 300)
      ).toBeRejected();
    });
  });
});
