/**
 * Reasons for earning or spending coins
 */
export type CoinTransactionReason =
  | 'correct_answer'
  | 'daily_goal'
  | 'badge_earned'
  | 'streak_milestone'
  | 'game_cost';

/**
 * Coin transaction record (stored in database)
 */
export interface CoinTransaction {
  id?: string;
  user_id?: string;
  amount: number; // Positive = earned, Negative = spent
  reason: CoinTransactionReason;
  related_id?: string; // badge_id, exercise_type, game_id, streak_days, etc.
  created_at?: string; // ISO timestamp
}

/**
 * Coin balance (stored in database)
 */
export interface CoinBalance {
  user_id?: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  updated_at?: string; // ISO timestamp
}

/**
 * Streak milestone coin rewards
 */
export const STREAK_COIN_REWARDS: Record<number, number> = {
  7: 50,
  14: 100,
  30: 250,
  50: 500,
  100: 1000,
};
