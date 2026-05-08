/**
 * User model representing a Schlaufuchs user account
 */
export interface User {
  id: string;
  username: string;
  avatar_style: string;
  created_at: string;
  last_active_at: string;
  math_daily_goal: number;
  clock_daily_goal: number;
  vocab_daily_goal: number;
}

/**
 * Data required to create a new user
 */
export interface CreateUserData {
  username: string;
  avatar_style: string;
}

/**
 * Available avatar styles from DiceBear
 */
export type AvatarStyle =
  | 'adventurer'
  | 'avataaars'
  | 'fun-emoji'
  | 'lorelei'
  | 'bottts'
  | 'pixel-art';
