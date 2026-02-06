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
  COST_TO_PLAY: 20,
  GRAVITY: 0.35,
  FLAP_VELOCITY: -7,
  FOX_SIZE: 50,
  PIPE_WIDTH: 70,
  CANVAS_WIDTH: 600,
  CANVAS_HEIGHT: 800,
  // Difficulty settings (start easy, get harder)
  INITIAL_PIPE_SPEED: 1.8,
  INITIAL_PIPE_GAP: 200,
  INITIAL_SPAWN_INTERVAL: 140,
  // Max difficulty values
  MAX_PIPE_SPEED: 3.5,
  MIN_PIPE_GAP: 130,
  MIN_SPAWN_INTERVAL: 80,
} as const;
