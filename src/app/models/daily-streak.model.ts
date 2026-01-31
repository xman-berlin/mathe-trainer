/**
 * Daily streak model for tracking practice consistency
 */
export interface DailyStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_practice_date: string | null; // ISO date string (YYYY-MM-DD)
  streak_milestones: number[]; // Achieved milestones [7, 14, 30, 50, 100, 365]
  created_at: string;
  updated_at: string;
}

/**
 * Update data for streak management
 */
export interface UpdateStreakData {
  current_streak: number;
  longest_streak: number;
  last_practice_date: string; // ISO date string (YYYY-MM-DD)
  streak_milestones: number[];
}

/**
 * Streak milestone levels
 */
export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 365] as const;

/**
 * Grace period in days before streak resets
 */
export const STREAK_GRACE_PERIOD_DAYS = 3;
