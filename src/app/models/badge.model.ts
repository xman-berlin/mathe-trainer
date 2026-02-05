import type { PersonalBest } from './stats.model';

/**
 * Badge categories
 */
export type BadgeCategory = 'performance' | 'consistency' | 'milestone' | 'challenge';

/**
 * Badge definition
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji
  category: BadgeCategory;
  requiredProgress: number;
  coinReward: number;
  checkFunction: (data: BadgeCheckData) => boolean;
}

/**
 * Data required to check badge eligibility
 */
export interface BadgeCheckData {
  lifetimeStats: Record<string, number>; // exerciseType -> correct count
  dailyStats: Record<string, { correct: number; incorrect: number }>; // exerciseType -> today's stats
  currentStreak: number;
  longestStreak: number;
  bestStreaksByType: Record<string, number>; // exerciseType -> best streak
  timeTrialBests: PersonalBest[];
  masteredReihen: number[]; // Array of mastered multiplication tables (1-10)
}

/**
 * Earned badge record (stored in database)
 */
export interface UserBadge {
  user_id?: string;
  badge_id: string;
  earned_at?: string; // ISO timestamp
}

/**
 * Badge progress for UI display
 */
export interface BadgeProgress {
  badge: Badge;
  current: number;
  required: number;
  earned: boolean;
  earnedAt?: string; // ISO timestamp
  percentage: number;
}
