/**
 * Daily statistics model
 */
export interface DailyStats {
  id?: string;
  user_id?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  correct: number;
  incorrect: number;
  stats_by_type: Record<string, ExerciseTypeStats>; // exerciseType -> stats
  math_daily_goal: number;
  clock_daily_goal: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Statistics for a specific exercise type
 */
export interface ExerciseTypeStats {
  correct: number;
  incorrect: number;
}

/**
 * Lifetime statistics model
 */
export interface LifetimeStats {
  user_id?: string;
  stats_by_type: Record<string, number>; // exerciseType -> correct count
  updated_at?: string;
}

/**
 * Time trial personal best record
 */
export interface PersonalBest {
  id?: string;
  user_id?: string;
  exercise_types: string[]; // Sorted array of exercise types
  correct_count: number;
  total_count: number;
  accuracy: number;
  achieved_at?: string;
}

/**
 * Multiplication mastery tracking
 */
export interface MultiplicationMastery {
  user_id?: string;
  reihe: number; // 1-10
  current_streak: number;
  mastered: boolean;
  mastered_at?: string | null;
}

/**
 * Complete mastery data for all multiplication tables
 */
export type MasteryData = Record<number, MultiplicationMastery>; // reihe -> mastery
