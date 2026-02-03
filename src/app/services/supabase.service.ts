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
          correct: stats.correct,
          incorrect: stats.incorrect,
          stats_by_type: stats.stats_by_type,
          math_daily_goal: stats.math_daily_goal,
          clock_daily_goal: stats.clock_daily_goal,
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
      correct: 0,
      incorrect: 0,
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
}
