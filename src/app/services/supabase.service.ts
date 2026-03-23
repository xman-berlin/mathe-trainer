import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import type {
  User,
  CreateUserData,
} from '../models/user.model';
import type {
  DailyStats,
  LifetimeStats,
  PersonalBest,
  MultiplicationMastery,
} from '../models/stats.model';
import type { DailyStreak, UpdateStreakData } from '../models/daily-streak.model';
import type { UserBadge } from '../models/badge.model';
import type { CoinBalance, CoinTransaction } from '../models/coin.model';
import type { GameScore } from '../models/game.model';
import type {
  VocabList,
  VocabWord,
  VocabAssignment,
  VocabWordProgress,
} from '../models/vocab.model';

/**
 * Service for interacting with Supabase backend
 * Provides type-safe methods for all database operations
 */
@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  // ============================================================================
  // USER METHODS
  // ============================================================================

  /**
   * Get a user by username
   */
  async getUser(username: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw error;
      }

      return data as User;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .insert({
          username: userData.username,
          avatar_style: userData.avatar_style,
        })
        .select()
        .single();

      if (error) throw error;

      // Initialize empty streak record
      await this.initializeStreak(data.id);

      return data as User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Get all users (for login page)
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .order('last_active_at', { ascending: false });

      if (error) throw error;

      return (data as User[]) || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Update user's last active timestamp
   */
  async updateLastActive(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating last active:', error);
      // Don't throw - this is non-critical
    }
  }

  // ============================================================================
  // DAILY STATS METHODS
  // ============================================================================

  /**
   * Get daily stats for a user and date
   */
  async getDailyStats(userId: string, date: string): Promise<DailyStats> {
    try {
      const { data, error } = await this.supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found - return empty stats
          return this.createEmptyDailyStats(date);
        }
        throw error;
      }

      return data as DailyStats;
    } catch (error) {
      console.error('Error fetching daily stats:', error);
      return this.createEmptyDailyStats(date);
    }
  }

  /**
   * Upsert (insert or update) daily stats
   */
  async upsertDailyStats(userId: string, stats: DailyStats): Promise<void> {
    try {
      const { error } = await this.supabase.from('daily_stats').upsert(
        {
          user_id: userId,
          date: stats.date,
          stats_by_type: stats.stats_by_type,
          math_daily_goal: stats.math_daily_goal,
          clock_daily_goal: stats.clock_daily_goal,
          ...(stats.vocab_daily_goal !== undefined ? { vocab_daily_goal: stats.vocab_daily_goal } : {}),
        },
        { onConflict: 'user_id,date' }
      );

      if (error) throw error;
    } catch (error) {
      console.error('Error upserting daily stats:', error);
      throw error;
    }
  }

  // ============================================================================
  // LIFETIME STATS METHODS
  // ============================================================================

  /**
   * Get lifetime stats for a user
   */
  async getLifetimeStats(userId: string): Promise<LifetimeStats> {
    try {
      const { data, error } = await this.supabase
        .from('lifetime_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found - return empty stats
          return { stats_by_type: {}, best_streaks_by_type: {} };
        }
        throw error;
      }

      return data as LifetimeStats;
    } catch (error) {
      console.error('Error fetching lifetime stats:', error);
      return { stats_by_type: {}, best_streaks_by_type: {} };
    }
  }

  /**
   * Upsert lifetime stats
   */
  async upsertLifetimeStats(userId: string, stats: LifetimeStats): Promise<void> {
    try {
      const { error } = await this.supabase.from('lifetime_stats').upsert(
        {
          user_id: userId,
          stats_by_type: stats.stats_by_type,
          best_streaks_by_type: stats.best_streaks_by_type || {},
        },
        { onConflict: 'user_id' }
      );

      if (error) throw error;
    } catch (error) {
      console.error('Error upserting lifetime stats:', error);
      throw error;
    }
  }

  // ============================================================================
  // TIME TRIAL METHODS
  // ============================================================================

  /**
   * Get all personal bests for a user
   */
  async getPersonalBests(userId: string): Promise<PersonalBest[]> {
    try {
      const { data, error } = await this.supabase
        .from('time_trial_bests')
        .select('*')
        .eq('user_id', userId)
        .order('achieved_at', { ascending: false });

      if (error) throw error;

      return (data as PersonalBest[]) || [];
    } catch (error) {
      console.error('Error fetching personal bests:', error);
      return [];
    }
  }

  /**
   * Get personal best for specific exercise types combination
   */
  async getPersonalBest(userId: string, exerciseTypes: string[]): Promise<PersonalBest | null> {
    try {
      // Sort exercise types for consistent comparison
      const sortedTypes = [...exerciseTypes].sort();

      const { data, error } = await this.supabase
        .from('time_trial_bests')
        .select('*')
        .eq('user_id', userId)
        .contains('exercise_types', sortedTypes)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as PersonalBest;
    } catch (error) {
      console.error('Error fetching personal best:', error);
      return null;
    }
  }

  /**
   * Upsert a personal best record
   */
  async upsertPersonalBest(userId: string, result: PersonalBest): Promise<void> {
    try {
      const sortedTypes = [...result.exercise_types].sort();

      const { error } = await this.supabase.from('time_trial_bests').upsert(
        {
          user_id: userId,
          exercise_types: sortedTypes,
          correct_count: result.correct_count,
          total_count: result.total_count,
          accuracy: result.accuracy,
        },
        { onConflict: 'user_id,exercise_types' }
      );

      if (error) throw error;
    } catch (error) {
      console.error('Error upserting personal best:', error);
      throw error;
    }
  }

  // ============================================================================
  // MASTERY METHODS
  // ============================================================================

  /**
   * Get all mastery records for a user
   */
  async getMastery(userId: string): Promise<MultiplicationMastery[]> {
    try {
      const { data, error } = await this.supabase
        .from('multiplication_mastery')
        .select('*')
        .eq('user_id', userId)
        .order('reihe', { ascending: true });

      if (error) throw error;

      return (data as MultiplicationMastery[]) || [];
    } catch (error) {
      console.error('Error fetching mastery:', error);
      return [];
    }
  }

  /**
   * Get mastery for a specific multiplication table
   */
  async getReihenMastery(userId: string, reihe: number): Promise<MultiplicationMastery | null> {
    try {
      const { data, error } = await this.supabase
        .from('multiplication_mastery')
        .select('*')
        .eq('user_id', userId)
        .eq('reihe', reihe)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as MultiplicationMastery;
    } catch (error) {
      console.error('Error fetching reihe mastery:', error);
      return null;
    }
  }

  /**
   * Upsert mastery data for a multiplication table
   */
  async upsertMastery(userId: string, mastery: MultiplicationMastery): Promise<void> {
    try {
      const { error } = await this.supabase.from('multiplication_mastery').upsert(
        {
          user_id: userId,
          reihe: mastery.reihe,
          current_streak: mastery.current_streak,
          mastered: mastery.mastered,
          mastered_at: mastery.mastered_at,
        },
        { onConflict: 'user_id,reihe' }
      );

      if (error) throw error;
    } catch (error) {
      console.error('Error upserting mastery:', error);
      throw error;
    }
  }

  // ============================================================================
  // STREAK METHODS
  // ============================================================================

  /**
   * Get daily streak for a user
   */
  async getDailyStreak(userId: string): Promise<DailyStreak> {
    try {
      const { data, error } = await this.supabase
        .from('daily_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found - return empty streak
          return this.createEmptyStreak(userId);
        }
        throw error;
      }

      return data as DailyStreak;
    } catch (error) {
      console.error('Error fetching daily streak:', error);
      return this.createEmptyStreak(userId);
    }
  }

  /**
   * Update daily streak
   */
  async updateStreak(userId: string, streakData: UpdateStreakData): Promise<void> {
    try {
      const { error } = await this.supabase.from('daily_streaks').upsert(
        {
          user_id: userId,
          current_streak: streakData.current_streak,
          longest_streak: streakData.longest_streak,
          last_practice_date: streakData.last_practice_date,
          streak_milestones: streakData.streak_milestones,
        },
        { onConflict: 'user_id' }
      );

      if (error) throw error;
    } catch (error) {
      console.error('Error updating streak:', error);
      throw error;
    }
  }

  /**
   * Initialize empty streak for new user
   */
  private async initializeStreak(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase.from('daily_streaks').insert({
        user_id: userId,
        current_streak: 0,
        longest_streak: 0,
        last_practice_date: null,
        streak_milestones: [],
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error initializing streak:', error);
      // Don't throw - non-critical
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Create empty daily stats object
   */
  private createEmptyDailyStats(date: string): DailyStats {
    return {
      date,
      stats_by_type: {},
      math_daily_goal: 20,
      clock_daily_goal: 20,
    };
  }

  /**
   * Create empty streak object
   */
  private createEmptyStreak(userId: string): DailyStreak {
    return {
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      last_practice_date: null,
      streak_milestones: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // ============================================================================
  // BADGE METHODS
  // ============================================================================

  /**
   * Get all earned badges for a user
   */
  async getUserBadges(userId: string): Promise<UserBadge[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      return (data as UserBadge[]) || [];
    } catch (error) {
      console.error('Error fetching user badges:', error);
      return [];
    }
  }

  /**
   * Award a badge to a user
   */
  async awardBadge(userId: string, badgeId: string): Promise<void> {
    try {
      const { error } = await this.supabase.from('user_badges').insert({
        user_id: userId,
        badge_id: badgeId,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error awarding badge:', error);
      throw error;
    }
  }

  /**
   * Check if user has earned a specific badge
   */
  async hasBadge(userId: string, badgeId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId)
        .eq('badge_id', badgeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false;
        }
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking badge:', error);
      return false;
    }
  }

  // ============================================================================
  // COIN METHODS
  // ============================================================================

  /**
   * Get coin balance for a user
   */
  async getCoinBalance(userId: string): Promise<CoinBalance> {
    try {
      const { data, error } = await this.supabase
        .from('coin_balances')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found - return empty balance
          return {
            balance: 0,
            total_earned: 0,
            total_spent: 0,
          };
        }
        throw error;
      }

      return data as CoinBalance;
    } catch (error) {
      console.error('Error fetching coin balance:', error);
      return {
        balance: 0,
        total_earned: 0,
        total_spent: 0,
      };
    }
  }

  /**
   * Upsert coin balance
   */
  async upsertCoinBalance(userId: string, balance: CoinBalance): Promise<void> {
    try {
      const { error } = await this.supabase.from('coin_balances').upsert(
        {
          user_id: userId,
          balance: balance.balance,
          total_earned: balance.total_earned,
          total_spent: balance.total_spent,
        },
        { onConflict: 'user_id' }
      );

      if (error) throw error;
    } catch (error) {
      console.error('Error upserting coin balance:', error);
      throw error;
    }
  }

  /**
   * Record a coin transaction
   */
  async recordCoinTransaction(transaction: CoinTransaction): Promise<void> {
    try {
      const { error } = await this.supabase.from('coin_transactions').insert({
        user_id: transaction.user_id,
        amount: transaction.amount,
        reason: transaction.reason,
        related_id: transaction.related_id,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error recording coin transaction:', error);
      throw error;
    }
  }

  /**
   * Get coin transaction history for a user
   */
  async getCoinTransactions(userId: string, limit = 50): Promise<CoinTransaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data as CoinTransaction[]) || [];
    } catch (error) {
      console.error('Error fetching coin transactions:', error);
      return [];
    }
  }

  // ============================================================================
  // GAME SCORE METHODS
  // ============================================================================

  /**
   * Get all game scores for a user
   */
  async getGameScores(userId: string): Promise<GameScore[]> {
    try {
      const { data, error } = await this.supabase
        .from('game_scores')
        .select('*')
        .eq('user_id', userId)
        .order('high_score', { ascending: false });

      if (error) throw error;

      return (data as GameScore[]) || [];
    } catch (error) {
      console.error('Error fetching game scores:', error);
      return [];
    }
  }

  /**
   * Get high score for a specific game
   */
  async getGameHighScore(userId: string, gameId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('game_scores')
        .select('high_score')
        .eq('user_id', userId)
        .eq('game_id', gameId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return 0;
        }
        throw error;
      }

      return data.high_score;
    } catch (error) {
      console.error('Error fetching game high score:', error);
      return 0;
    }
  }

  /**
   * Upsert game score
   */
  async upsertGameScore(userId: string, score: GameScore): Promise<void> {
    try {
      const { error } = await this.supabase.from('game_scores').upsert(
        {
          user_id: userId,
          game_id: score.game_id,
          high_score: score.high_score,
          times_played: score.times_played,
          last_played_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,game_id' }
      );

      if (error) throw error;
    } catch (error) {
      console.error('Error upserting game score:', error);
      throw error;
    }
  }

  // ============================================================================
  // VOCAB LIST METHODS
  // ============================================================================

  async getVocabLists(): Promise<VocabList[]> {
    try {
      const { data, error } = await this.supabase
        .from('vocab_lists')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return (data as VocabList[]) || [];
    } catch (error) {
      console.error('Error fetching vocab lists:', error);
      return [];
    }
  }

  async createVocabList(name: string): Promise<VocabList> {
    const { data, error } = await this.supabase
      .from('vocab_lists')
      .insert({ name })
      .select()
      .single();
    if (error) throw error;
    return data as VocabList;
  }

  async updateVocabList(listId: string, name: string): Promise<void> {
    const { error } = await this.supabase
      .from('vocab_lists')
      .update({ name })
      .eq('id', listId);
    if (error) throw error;
  }

  async deleteVocabList(listId: string): Promise<void> {
    const { error } = await this.supabase
      .from('vocab_lists')
      .delete()
      .eq('id', listId);
    if (error) throw error;
  }

  // ============================================================================
  // VOCAB WORD METHODS
  // ============================================================================

  async getVocabListWords(listId: string): Promise<VocabWord[]> {
    try {
      const { data, error } = await this.supabase
        .from('vocab_list_words')
        .select('*')
        .eq('list_id', listId)
        .order('word');
      if (error) throw error;
      return (data as VocabWord[]) || [];
    } catch (error) {
      console.error('Error fetching vocab words:', error);
      return [];
    }
  }

  async addVocabWord(listId: string, word: string): Promise<VocabWord> {
    const { data, error } = await this.supabase
      .from('vocab_list_words')
      .insert({ list_id: listId, word })
      .select()
      .single();
    if (error) throw error;
    return data as VocabWord;
  }

  async updateVocabWord(wordId: string, word: string): Promise<void> {
    const { error } = await this.supabase
      .from('vocab_list_words')
      .update({ word })
      .eq('id', wordId);
    if (error) throw error;
  }

  async deleteVocabWord(wordId: string): Promise<void> {
    const { error } = await this.supabase
      .from('vocab_list_words')
      .delete()
      .eq('id', wordId);
    if (error) throw error;
  }

  // ============================================================================
  // VOCAB ASSIGNMENT METHODS
  // ============================================================================

  async getVocabAssignmentsForUser(userId: string): Promise<VocabAssignment[]> {
    try {
      const { data, error } = await this.supabase
        .from('vocab_user_assignments')
        .select('*, list:vocab_lists(*)')
        .eq('user_id', userId)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return (data as VocabAssignment[]) || [];
    } catch (error) {
      console.error('Error fetching vocab assignments:', error);
      return [];
    }
  }

  async assignListToUser(userId: string, listId: string): Promise<void> {
    const { error } = await this.supabase
      .from('vocab_user_assignments')
      .upsert({ user_id: userId, list_id: listId }, { onConflict: 'user_id,list_id' });
    if (error) throw error;
  }

  async unassignListFromUser(userId: string, listId: string): Promise<void> {
    const { error } = await this.supabase
      .from('vocab_user_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('list_id', listId);
    if (error) throw error;
  }

  // ============================================================================
  // VOCAB WORD PROGRESS METHODS
  // ============================================================================

  async getWordProgressForUser(userId: string): Promise<VocabWordProgress[]> {
    try {
      const { data, error } = await this.supabase
        .from('vocab_word_progress')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return (data as VocabWordProgress[]) || [];
    } catch (error) {
      console.error('Error fetching word progress:', error);
      return [];
    }
  }

  async upsertWordProgress(userId: string, wordId: string, weight: number): Promise<void> {
    const { error } = await this.supabase
      .from('vocab_word_progress')
      .upsert({ user_id: userId, word_id: wordId, weight }, { onConflict: 'user_id,word_id' });
    if (error) throw error;
  }
}
