import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { DailyStreak } from '../models/daily-streak.model';
import { STREAK_MILESTONES, STREAK_GRACE_PERIOD_DAYS } from '../models/daily-streak.model';

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

  constructor(private supabase: SupabaseService) {}

  /**
   * Load streak data for a user
   */
  async loadStreak(userId: string): Promise<void> {
    try {
      const streak = await this.supabase.getDailyStreak(userId);
      this.streakData.set(streak);
    } catch (error) {
      console.error('Error loading streak:', error);
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

      // Already practiced today?
      if (lastPractice && this.isSameDay(lastPractice, new Date())) {
        return; // No update needed
      }

      const daysSinceLastPractice = lastPractice
        ? this.daysBetween(lastPractice, new Date())
        : 0;

      let newStreak: number;

      if (daysSinceLastPractice === 0) {
        // Same day - no change (shouldn't happen due to check above)
        newStreak = streak.current_streak;
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

      // Show milestone celebration if achieved
      if (milestoneAchieved) {
        this.celebrateMilestone(milestoneAchieved);
      }
    } catch (error) {
      console.error('Error recording practice:', error);
    }
  }

  /**
   * Check and update streak (called on app startup to handle grace period expiry)
   */
  async checkAndUpdateStreak(userId: string): Promise<void> {
    try {
      const streak = await this.supabase.getDailyStreak(userId);
      this.streakData.set(streak);

      if (!streak.last_practice_date || streak.current_streak === 0) {
        return; // No active streak
      }

      const lastPractice = new Date(streak.last_practice_date);
      const today = new Date();
      const daysSince = this.daysBetween(lastPractice, today);

      // Check if streak should be reset (beyond grace period)
      if (daysSince > this.GRACE_PERIOD_DAYS) {
        await this.supabase.updateStreak(userId, {
          current_streak: 0,
          longest_streak: streak.longest_streak, // Keep longest
          last_practice_date: streak.last_practice_date,
          streak_milestones: streak.streak_milestones, // Keep achievements
        });

        this.streakData.set({
          ...streak,
          current_streak: 0,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error checking streak:', error);
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
  private celebrateMilestone(milestone: number): void {
    console.log(`🎉 Milestone achieved: ${milestone} day streak!`);
    // TODO: Show celebration animation/modal
    // This will be implemented when we add the UI components
  }
}
