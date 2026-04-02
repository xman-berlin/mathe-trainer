import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GameService } from './game.service';
import { SupabaseService } from './supabase.service';
import { CoinsService } from './coins.service';
import type { GameScore } from '../models/game.model';

describe('GameService', () => {
  let service: GameService;
  let mockSupabase: jasmine.SpyObj<SupabaseService>;
  let mockCoins: jasmine.SpyObj<CoinsService>;

  beforeEach(() => {
    mockSupabase = jasmine.createSpyObj('SupabaseService', [
      'getGameScores',
      'upsertGameScore',
    ]);
    mockCoins = jasmine.createSpyObj('CoinsService', ['canAfford', 'spendCoins']);

    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        GameService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: CoinsService, useValue: mockCoins },
      ],
    });

    service = TestBed.inject(GameService);
  });

  // ─── Initial State ──────────────────────────────────────────

  describe('initial state', () => {
    it('should have 4 available games', () => {
      expect(service.games().length).toBe(4);
    });

    it('should have flappy-fox game', () => {
      const ids = service.games().map((g) => g.id);
      expect(ids).toContain('flappy-fox');
    });

    it('should have dino-run game', () => {
      const ids = service.games().map((g) => g.id);
      expect(ids).toContain('dino-run');
    });

    it('should have breakout game', () => {
      const ids = service.games().map((g) => g.id);
      expect(ids).toContain('breakout');
    });

    it('should have balloon-pop game', () => {
      const ids = service.games().map((g) => g.id);
      expect(ids).toContain('balloon-pop');
    });
  });

  // ─── loadScores ─────────────────────────────────────────────

  describe('loadScores', () => {
    it('should load scores from supabase', async () => {
      const scores: GameScore[] = [
        { game_id: 'flappy-fox', high_score: 10, times_played: 3 },
      ];
      mockSupabase.getGameScores.and.resolveTo(scores);

      await service.loadScores('user-1');
      expect(service.getHighScore('flappy-fox')).toBe(10);
      expect(service.getTimesPlayed('flappy-fox')).toBe(3);
    });

    it('should merge with localStorage scores (take higher)', async () => {
      mockSupabase.getGameScores.and.resolveTo([
        { game_id: 'flappy-fox', high_score: 5, times_played: 2 },
      ]);
      (localStorage.getItem as jasmine.Spy).and.returnValue(
        JSON.stringify([{ game_id: 'flappy-fox', high_score: 15, times_played: 4 }])
      );

      await service.loadScores('user-1');
      expect(service.getHighScore('flappy-fox')).toBe(15);
    });

    it('should fallback to localStorage on supabase error', async () => {
      mockSupabase.getGameScores.and.rejectWith(new Error('network'));
      (localStorage.getItem as jasmine.Spy).and.returnValue(
        JSON.stringify([{ game_id: 'dino-run', high_score: 20, times_played: 5 }])
      );

      await service.loadScores('user-1');
      expect(service.getHighScore('dino-run')).toBe(20);
    });

    it('should return 0 for unknown game', async () => {
      mockSupabase.getGameScores.and.resolveTo([]);
      await service.loadScores('user-1');
      expect(service.getHighScore('unknown')).toBe(0);
    });
  });

  // ─── startGame ──────────────────────────────────────────────

  describe('startGame', () => {
    it('should deduct coins when user can afford', async () => {
      mockCoins.canAfford.and.returnValue(true);
      mockCoins.spendCoins.and.resolveTo(true);

      const result = await service.startGame('user-1', 'flappy-fox');
      expect(result).toBeTrue();
      expect(mockCoins.spendCoins).toHaveBeenCalledWith('user-1', 20, 'game_cost', 'flappy-fox');
    });

    it('should return false when user cannot afford', async () => {
      mockCoins.canAfford.and.returnValue(false);

      const result = await service.startGame('user-1', 'flappy-fox');
      expect(result).toBeFalse();
      expect(mockCoins.spendCoins).not.toHaveBeenCalled();
    });

    it('should return false for unknown game', async () => {
      const result = await service.startGame('user-1', 'unknown-game');
      expect(result).toBeFalse();
    });
  });

  // ─── saveScore ──────────────────────────────────────────────

  describe('saveScore', () => {
    beforeEach(() => {
      mockSupabase.getGameScores.and.resolveTo([]);
      mockSupabase.upsertGameScore.and.resolveTo();
    });

    it('should return true for first score (new high)', async () => {
      await service.loadScores('user-1');
      const result = await service.saveScore('user-1', 'flappy-fox', 10);
      expect(result).toBeTrue();
    });

    it('should return true when score beats high score', async () => {
      await service.loadScores('user-1');
      await service.saveScore('user-1', 'flappy-fox', 5);
      const result = await service.saveScore('user-1', 'flappy-fox', 10);
      expect(result).toBeTrue();
    });

    it('should return false when score does not beat high score', async () => {
      await service.loadScores('user-1');
      await service.saveScore('user-1', 'flappy-fox', 10);
      const result = await service.saveScore('user-1', 'flappy-fox', 5);
      expect(result).toBeFalse();
    });

    it('should increment times played', async () => {
      await service.loadScores('user-1');
      await service.saveScore('user-1', 'flappy-fox', 10);
      await service.saveScore('user-1', 'flappy-fox', 8);
      expect(service.getTimesPlayed('flappy-fox')).toBe(2);
    });

    it('should persist to localStorage', async () => {
      await service.loadScores('user-1');
      await service.saveScore('user-1', 'flappy-fox', 10);
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  // ─── canAffordGame ──────────────────────────────────────────

  describe('canAffordGame', () => {
    it('should delegate to coinsService', () => {
      mockCoins.canAfford.and.returnValue(true);
      expect(service.canAffordGame('flappy-fox')).toBeTrue();
    });

    it('should return false for unknown game', () => {
      expect(service.canAffordGame('unknown')).toBeFalse();
    });
  });

  // ─── getScoreSignal ─────────────────────────────────────────

  describe('getScoreSignal', () => {
    it('should return default score for unknown game', async () => {
      mockSupabase.getGameScores.and.resolveTo([]);
      await service.loadScores('user-1');

      const signal = service.getScoreSignal('flappy-fox');
      expect(signal().high_score).toBe(0);
      expect(signal().times_played).toBe(0);
    });
  });

  // ─── reset ──────────────────────────────────────────────────

  describe('reset', () => {
    it('should clear all scores', async () => {
      mockSupabase.getGameScores.and.resolveTo([
        { game_id: 'flappy-fox', high_score: 10, times_played: 3 },
      ]);
      await service.loadScores('user-1');

      service.reset();
      expect(service.getHighScore('flappy-fox')).toBe(0);
    });
  });
});
