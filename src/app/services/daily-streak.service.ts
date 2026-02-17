import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CoinsService } from './coins.service';
import type { DailyStreak } from '../models/daily-streak.model';
import { STREAK_MILESTONES, STREAK_GRACE_PERIOD_DAYS } from '../models/daily-streak.model';
import { STREAK_COIN_REWARDS } from '../models/coin.model';

/**
 * Service for managing daily practice streaks
 * Handles streak calculation with 3-day grace period and milestone tracking
 */
@Injectable({
  providedIn: 'root',
})
export class DailyStreakService {
  // Signals
  streakData = signal<DailyStreak | null>(null);
  currentStreak = computed(() => this.streakData()?.current_streak ?? 0);
  longestStreak = computed(() => this.streakData()?.longest_streak ?? 0);
  lastPracticeDate = computed(() => this.streakData()?.last_practice_date ?? null);
  achievedMilestones = computed(() => this.streakData()?.streak_milestones ?? []);

  // Milestone configuration
  readonly MILESTONES = STREAK_MILESTONES;
  readonly GRACE_PERIOD_DAYS = STREAK_GRACE_PERIOD_DAYS;

  private supabase = inject(SupabaseService);
  private coinsService = inject(CoinsService);

  /**
   * Load streak data for a user
   */
  async loadStreak(userId: string): Promise<void> {
    try {
      const streak = await this.supabase.getDailyStreak(userId);
      this.streakData.set(streak);
    } catch (error) {
      console.error('[StreakService] Error loading streak:', error);
    }
  }

  /**
   * Record practice for today - updates streak if needed
   * Should be called when user completes first correct answer of the day
   */
  async recordPractice(userId: string): Promise<void> {
    try {
      const streak = this.streakData();
      if (!streak) {
        await this.loadStreak(userId);
        return this.recordPractice(userId);
      }

      const today = this.getTodayDateString();
      const lastPractice = streak.last_practice_date
        ? new Date(streak.last_practice_date)
        : null;


      // Already practiced today AND streak is already set?
      if (lastPractice && this.isSameDay(lastPractice, new Date()) && streak.current_streak > 0) {
        return; // No update needed
      }

      // Special case: last_practice_date is today but streak is 0 (corrupted state)
      if (lastPractice && this.isSameDay(lastPractice, new Date()) && streak.current_streak === 0) {
        // Fall through to update the streak
      }

      let newStreak: number;

      // No previous practice - this is the first ever
      if (!lastPractice) {
        newStreak = 1;
      } else {
        const daysSinceLastPractice = this.daysBetween(lastPractice, new Date());

        if (daysSinceLastPractice === 0) {
          // Same day - but if streak is 0, this is the first practice today, set to 1
          if (streak.current_streak === 0) {
            newStreak = 1;
          } else {
            newStreak = streak.current_streak;
          }
        } else if (daysSinceLastPractice === 1) {
          // Consecutive day - increment streak
          newStreak = streak.current_streak + 1;
        } else if (daysSinceLastPractice <= this.GRACE_PERIOD_DAYS) {
          // Within grace period - maintain streak (no increment)
          newStreak = streak.current_streak;
        } else {
          // Grace period exceeded - reset to 1
          newStreak = 1;
        }
      }

      const longestStreak = Math.max(newStreak, streak.longest_streak);
      const newMilestones = this.updateMilestones(newStreak, streak.streak_milestones);

      // Check if new milestone was achieved
      const milestoneAchieved =
        newMilestones.length > streak.streak_milestones.length
          ? newMilestones[newMilestones.length - 1]
          : null;


      // Update database
      await this.supabase.updateStreak(userId, {
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_practice_date: today,
        streak_milestones: newMilestones,
      });


      // Update local state
      this.streakData.set({
        ...streak,
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_practice_date: today,
        streak_milestones: newMilestones,
        updated_at: new Date().toISOString(),
      });

      // Show milestone celebration and award coins if achieved
      if (milestoneAchieved) {
        this.celebrateMilestone(milestoneAchieved);
        await this.awardMilestoneCoins(userId, milestoneAchieved);
      }
    } catch (error) {
      console.error('Error recording practice:', error);
    }
  }

  /**
   * Check and update streak (called on app startup to handle grace period expiry and corrupted states)
   */
  async checkAndUpdateStreak(userId: string): Promise<void> {
    try {
      const streak = await this.supabase.getDailyStreak(userId);
      this.streakData.set(streak);


      // Check for corrupted state: practiced today but streak is 0
      if (streak.last_practice_date) {
        const lastPractice = new Date(streak.last_practice_date);
        const today = new Date();
        const daysSince = this.daysBetween(lastPractice, today);


        // Corrupted state: practiced today (daysSince = 0) but streak is 0
        if (daysSince === 0 && streak.current_streak === 0) {
          await this.supabase.updateStreak(userId, {
            current_streak: 1,
            longest_streak: Math.max(1, streak.longest_streak),
            last_practice_date: streak.last_practice_date,
            streak_milestones: [],
          });

          this.streakData.set({
            ...streak,
            current_streak: 1,
            longest_streak: Math.max(1, streak.longest_streak),
            updated_at: new Date().toISOString(),
          });

          return;
        }

        // Normal check: reset if grace period exceeded
        if (streak.current_streak > 0 && daysSince > this.GRACE_PERIOD_DAYS) {
          await this.supabase.updateStreak(userId, {
            current_streak: 0,
            longest_streak: streak.longest_streak,
            last_practice_date: streak.last_practice_date,
            streak_milestones: streak.streak_milestones,
          });

          this.streakData.set({
            ...streak,
            current_streak: 0,
            updated_at: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('[StreakService] Error checking streak:', error);
    }
  }

  /**
   * Get next milestone to achieve
   */
  getNextMilestone(): number | null {
    const current = this.currentStreak();
    const next = this.MILESTONES.find((m) => m > current);
    return next ?? null;
  }

  /**
   * Get days until next milestone
   */
  getDaysToNextMilestone(): number | null {
    const next = this.getNextMilestone();
    if (!next) return null;
    return next - this.currentStreak();
  }

  /**
   * Check if current streak is at a milestone
   */
  isAtMilestone(): boolean {
    const current = this.currentStreak();
    return this.MILESTONES.includes(current as (typeof this.MILESTONES)[number]);
  }

  /**
   * Clear all user data (called on logout)
   */
  clearUserData(): void {
    this.streakData.set(null);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Update milestone list when new streak is reached
   */
  private updateMilestones(streak: number, currentMilestones: number[]): number[] {
    const achieved = this.MILESTONES.filter((m) => streak >= m);
    return Array.from(new Set([...currentMilestones, ...achieved])).sort((a, b) => a - b);
  }

  /**
   * Calculate days between two dates
   */
  private daysBetween(date1: Date, date2: Date): number {
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const diffMs = date2.getTime() - date1.getTime();
    return Math.floor(diffMs / ONE_DAY);
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  /**
   * Get today's date as ISO string (YYYY-MM-DD)
   */
  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Celebrate milestone achievement
   * TODO: Implement visual celebration (confetti, modal, etc.)
   */
  private celebrateMilestone(_milestone: number): void {
    // TODO: Show celebration animation/modal
    // This will be implemented when we add the UI components
  }

  /**
   * Award coins for streak milestone
   */
  private async awardMilestoneCoins(userId: string, milestone: number): Promise<void> {
    const coinReward = STREAK_COIN_REWARDS[milestone];
    if (coinReward) {
      try {
        await this.coinsService.awardCoins(
          userId,
          coinReward,
          'streak_milestone',
          String(milestone)
        );
      } catch (error) {
        console.error('Failed to award milestone coins:', error);
      }
    }
  }
}
