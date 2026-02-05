/**
 * Game configuration
 */
export interface GameConfig {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji
  costToPlay: number;
  route: string;
}

/**
 * Game score record (stored in database)
 */
export interface GameScore {
  user_id?: string;
  game_id: string;
  high_score: number;
  times_played: number;
  last_played_at?: string; // ISO timestamp
}

/**
 * Flappy Fox game state
 */
export type FlappyFoxState = 'READY' | 'PLAYING' | 'GAME_OVER';

/**
 * Flappy Fox game configuration
 */
export const FLAPPY_FOX_CONFIG = {
  GAME_ID: 'flappy-fox',
  COST_TO_PLAY: 100,
  GRAVITY: 0.6,
  FLAP_VELOCITY: -10,
  PIPE_SPEED: 3,
  PIPE_GAP: 150,
  PIPE_WIDTH: 60,
  FOX_SIZE: 40,
  CANVAS_WIDTH: 400,
  CANVAS_HEIGHT: 600,
} as const;
