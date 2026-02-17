import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { DailyStats, LifetimeStats } from '../models/stats.model';

const MIGRATION_KEY = 'schlaufuchs-migrated';
const STATS_KEY = 'schlaufuchs-stats';
const LIFETIME_KEY = 'schlaufuchs-lifetime-stats';
const TIME_TRIALS_KEY = 'schlaufuchs-time-trials';

interface TimeTrialRecord {
  exercise_types: string[];
  correct_count: number;
  total_count: number;
  accuracy: number;
}

interface LocalTimeTrialValue {
  correctCount: number;
  totalCount: number;
  accuracy: number;
}

/**
 * Service for migrating old localStorage data to user-based server storage
 * Used once when upgrading from single-user to multi-user version
 */
@Injectable({
  providedIn: 'root',
})
export class MigrationService {
  private supabase = inject(SupabaseService);

  /**
   * Check if user has already migrated their data
   */
  hasMigratedData(): boolean {
    return localStorage.getItem(MIGRATION_KEY) === 'true';
  }

  /**
   * Check if there is old data available to migrate
   */
  hasOldDataAvailable(): boolean {
    return (
      localStorage.getItem(STATS_KEY) !== null ||
      localStorage.getItem(LIFETIME_KEY) !== null ||
      localStorage.getItem(TIME_TRIALS_KEY) !== null
    );
  }

  /**
   * Migrate all old localStorage data to a user account
   */
  async migrateLocalDataToUser(userId: string): Promise<void> {
    try {

      // Migrate daily stats
      const dailyStats = this.loadLocalDailyStats();
      if (dailyStats) {
        await this.supabase.upsertDailyStats(userId, dailyStats);
      }

      // Migrate lifetime stats
      const lifetimeStats = this.loadLocalLifetimeStats();
      if (lifetimeStats) {
        await this.supabase.upsertLifetimeStats(userId, lifetimeStats);
      }

      // Migrate time trial data
      const timeTrials = this.loadLocalTimeTrials();
      if (timeTrials && timeTrials.length > 0) {
        for (const trial of timeTrials) {
          await this.supabase.upsertPersonalBest(userId, trial);
        }
      }

      // Mark migration as complete
      this.markMigrationComplete();

    } catch (error) {
      console.error('Error during migration:', error);
      throw error;
    }
  }

  /**
   * Skip migration and mark as complete (for users who want to start fresh)
   */
  skipMigration(): void {
    this.markMigrationComplete();
  }

  /**
   * Clear old localStorage data (optional cleanup after migration)
   */
  clearOldData(): void {
    localStorage.removeItem(STATS_KEY);
    localStorage.removeItem(LIFETIME_KEY);
    localStorage.removeItem(TIME_TRIALS_KEY);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Load daily stats from old localStorage format
   */
  private loadLocalDailyStats(): DailyStats | null {
    try {
      const stored = localStorage.getItem(STATS_KEY);
      if (!stored) {
        return null;
      }

      const data = JSON.parse(stored);

      // Convert old format to new format
      // Note: byType is the old format, stats_by_type is the new format
      const statsData = {
        date: data.date || new Date().toISOString().split('T')[0],
        correct: data.correct || 0,
        incorrect: data.incorrect || 0,
        stats_by_type: data.byType || data.statsByType || {},
        math_daily_goal: data.dailyGoal || data.mathDailyGoal || 20,
        clock_daily_goal: data.clockDailyGoal || 20,
      };

      return statsData;
    } catch (error) {
      console.error('Error loading local daily stats:', error);
      return null;
    }
  }

  /**
   * Load lifetime stats from old localStorage format
   */
  private loadLocalLifetimeStats(): LifetimeStats | null {
    try {
      const stored = localStorage.getItem(LIFETIME_KEY);
      if (!stored) {
        return null;
      }

      const data = JSON.parse(stored);

      // Convert old format to new format
      const lifetimeData = {
        stats_by_type: data.byType || data.statsByType || {},
      };

      return lifetimeData;
    } catch (error) {
      console.error('Error loading local lifetime stats:', error);
      return null;
    }
  }

  /**
   * Load time trial personal bests from old localStorage format
   */
  private loadLocalTimeTrials(): TimeTrialRecord[] | null {
    try {
      const stored = localStorage.getItem(TIME_TRIALS_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored) as unknown;

      // Convert array of personal bests
      if (Array.isArray(data)) {
        return data.map((trial) => ({
          exercise_types: trial.exerciseTypes || [],
          correct_count: trial.correctCount || 0,
          total_count: trial.totalCount || 0,
          accuracy: trial.accuracy || 0,
        }));
      }

      // Convert object format (old format)
      if (typeof data === 'object' && data !== null) {
        return Object.entries(data as Record<string, LocalTimeTrialValue>).map(([key, value]) => ({
          exercise_types: key.split(','),
          correct_count: value.correctCount || 0,
          total_count: value.totalCount || 0,
          accuracy: value.accuracy || 0,
        }));
      }

      return null;
    } catch (error) {
      console.error('Error loading local time trials:', error);
      return null;
    }
  }

  /**
   * Mark migration as complete
   */
  private markMigrationComplete(): void {
    localStorage.setItem(MIGRATION_KEY, 'true');
  }
}
