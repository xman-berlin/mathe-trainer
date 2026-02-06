import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CoinsService } from './coins.service';
import type { GameConfig, GameScore } from '../models/game.model';
import { FLAPPY_FOX_CONFIG } from '../models/game.model';

/**
 * Available games configuration
 */
export const AVAILABLE_GAMES: GameConfig[] = [
  {
    id: FLAPPY_FOX_CONFIG.GAME_ID,
    name: 'Flappy Fox',
    description: 'Hilf dem Fuchs durch die Röhren zu fliegen!',
    icon: '🦊',
    costToPlay: FLAPPY_FOX_CONFIG.COST_TO_PLAY,
    route: '/spielen/flappy-fox',
  },
];

/**
 * Service for managing games
 * Handles game sessions, scores, and coin integration
 */
@Injectable({
  providedIn: 'root',
})
export class GameService {
  private supabase = inject(SupabaseService);
  private coinsService = inject(CoinsService);

  // Signals
  private scoresSignal = signal<Map<string, GameScore>>(new Map());
  private currentUserId = signal<string | null>(null);

  // localStorage key
  private readonly STORAGE_KEY = 'schlaufuchs-game-scores';

  // Public computed
  public games = signal<GameConfig[]>(AVAILABLE_GAMES);

  /**
   * Load scores for a user
   */
  async loadScores(userId: string): Promise<void> {
    this.currentUserId.set(userId);

    try {
      // Try to load from Supabase first
      const supabaseScores = await this.supabase.getGameScores(userId);

      // Load from localStorage as fallback
      const localScores = this.loadFromLocalStorage(userId);

      // Merge scores (use higher high_score from either source)
      const mergedScores = new Map<string, GameScore>();

      // Add Supabase scores
      for (const score of supabaseScores) {
        mergedScores.set(score.game_id, score);
      }

      // Merge local scores (take higher value)
      for (const [gameId, localScore] of localScores) {
        const existing = mergedScores.get(gameId);
        if (!existing || localScore.high_score > existing.high_score) {
          mergedScores.set(gameId, localScore);
        }
      }

      this.scoresSignal.set(mergedScores);
    } catch (error) {
      console.error('Error loading game scores:', error);
      // Fallback to localStorage
      const localScores = this.loadFromLocalStorage(userId);
      this.scoresSignal.set(localScores);
    }
  }

  /**
   * Start a game session (deducts coins)
   * Returns true if game can start, false if not enough coins
   */
  async startGame(userId: string, gameId: string): Promise<boolean> {
    const game = AVAILABLE_GAMES.find((g) => g.id === gameId);
    if (!game) {
      console.error('Unknown game:', gameId);
      return false;
    }

    // Check if user can afford
    if (!this.coinsService.canAfford(game.costToPlay)) {
      return false;
    }

    // Deduct coins
    const success = await this.coinsService.spendCoins(
      userId,
      game.costToPlay,
      'game_cost',
      gameId
    );

    return success;
  }

  /**
   * Save a score after game ends
   * Returns true if it's a new high score
   */
  async saveScore(userId: string, gameId: string, score: number): Promise<boolean> {
    const scores = this.scoresSignal();
    const existingScore = scores.get(gameId);

    const isNewHighScore = !existingScore || score > existingScore.high_score;

    const newScore: GameScore = {
      game_id: gameId,
      high_score: isNewHighScore ? score : existingScore?.high_score ?? score,
      times_played: (existingScore?.times_played ?? 0) + 1,
    };

    // Optimistic update
    const newScores = new Map(scores);
    newScores.set(gameId, newScore);
    this.scoresSignal.set(newScores);

    // Save to localStorage
    this.saveToLocalStorage(userId, newScores);

    // Sync to Supabase
    try {
      await this.supabase.upsertGameScore(userId, newScore);
    } catch (error) {
      console.error('Error saving game score to Supabase:', error);
      // Score is saved locally, will sync on next load
    }

    return isNewHighScore;
  }

  /**
   * Get high score for a game
   */
  getHighScore(gameId: string): number {
    const score = this.scoresSignal().get(gameId);
    return score?.high_score ?? 0;
  }

  /**
   * Get times played for a game
   */
  getTimesPlayed(gameId: string): number {
    const score = this.scoresSignal().get(gameId);
    return score?.times_played ?? 0;
  }

  /**
   * Get score signal for a specific game (reactive)
   */
  getScoreSignal(gameId: string) {
    return computed(() => {
      const scores = this.scoresSignal();
      return scores.get(gameId) ?? { game_id: gameId, high_score: 0, times_played: 0 };
    });
  }

  /**
   * Check if user can afford a game
   */
  canAffordGame(gameId: string): boolean {
    const game = AVAILABLE_GAMES.find((g) => g.id === gameId);
    if (!game) return false;
    return this.coinsService.canAfford(game.costToPlay);
  }

  /**
   * Reset scores (for user switching)
   */
  reset(): void {
    this.scoresSignal.set(new Map());
    this.currentUserId.set(null);
  }

  // ============================================================================
  // PRIVATE METHODS - localStorage
  // ============================================================================

  private loadFromLocalStorage(userId: string): Map<string, GameScore> {
    try {
      const key = `${this.STORAGE_KEY}-${userId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as GameScore[];
        const map = new Map<string, GameScore>();
        for (const score of parsed) {
          map.set(score.game_id, score);
        }
        return map;
      }
    } catch (error) {
      console.error('Error loading game scores from localStorage:', error);
    }

    return new Map();
  }

  private saveToLocalStorage(userId: string, scores: Map<string, GameScore>): void {
    try {
      const key = `${this.STORAGE_KEY}-${userId}`;
      const scoresArray = Array.from(scores.values());
      localStorage.setItem(key, JSON.stringify(scoresArray));
    } catch (error) {
      console.error('Error saving game scores to localStorage:', error);
    }
  }
}
