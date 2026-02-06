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
 * Common game state type
 */
export type GameState = 'READY' | 'PLAYING' | 'GAME_OVER';

/**
 * Flappy Fox game state (alias for backward compatibility)
 */
export type FlappyFoxState = GameState;

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

/**
 * Dino Run game configuration
 */
export const DINO_RUN_CONFIG = {
  GAME_ID: 'dino-run',
  COST_TO_PLAY: 20,
  CANVAS_WIDTH: 600,
  CANVAS_HEIGHT: 300,
  // Physics
  GRAVITY: 0.8,
  JUMP_VELOCITY: -14,
  GROUND_Y: 250, // Ground level
  // Player
  PLAYER_SIZE: 50,
  PLAYER_X: 80,
  // Obstacles
  OBSTACLE_WIDTH: 30,
  OBSTACLE_MIN_HEIGHT: 40,
  OBSTACLE_MAX_HEIGHT: 60,
  BIRD_SIZE: 35,
  BIRD_HEIGHT_LOW: 180,
  BIRD_HEIGHT_HIGH: 140,
  // Difficulty
  INITIAL_SPEED: 5,
  MAX_SPEED: 12,
  SPAWN_INTERVAL_MIN: 60,
  SPAWN_INTERVAL_MAX: 120,
  SPEED_INCREMENT: 0.002, // Speed increase per frame
} as const;

/**
 * Breakout game configuration
 */
export const BREAKOUT_CONFIG = {
  GAME_ID: 'breakout',
  COST_TO_PLAY: 20,
  CANVAS_WIDTH: 500,
  CANVAS_HEIGHT: 600,
  // Paddle
  PADDLE_WIDTH: 80,
  PADDLE_HEIGHT: 12,
  PADDLE_Y: 560,
  PADDLE_SPEED: 8,
  // Ball
  BALL_RADIUS: 8,
  BALL_SPEED: 5,
  // Blocks
  BLOCK_ROWS: 5,
  BLOCK_COLS: 8,
  BLOCK_WIDTH: 55,
  BLOCK_HEIGHT: 20,
  BLOCK_PADDING: 5,
  BLOCK_OFFSET_TOP: 60,
  BLOCK_OFFSET_LEFT: 22,
  // Points per row (top row = most points)
  BLOCK_POINTS: [50, 40, 30, 20, 10],
  // Lives
  INITIAL_LIVES: 3,
} as const;

/**
 * Balloon Pop game configuration
 */
export const BALLOON_POP_CONFIG = {
  GAME_ID: 'balloon-pop',
  COST_TO_PLAY: 20,
  CANVAS_WIDTH: 500,
  CANVAS_HEIGHT: 700,
  // Balloons
  BALLOON_WIDTH: 60,
  BALLOON_HEIGHT: 80,
  BALLOON_RISE_SPEED: 1.2,
  MIN_BALLOONS: 4,
  MAX_BALLOONS: 6,
  SPAWN_Y: 750, // Below canvas
  // Gameplay
  INITIAL_LIVES: 3,
  POINTS_PER_CORRECT: 10,
  TIME_BONUS_THRESHOLD: 3000, // ms for bonus points
  TIME_BONUS_POINTS: 5,
} as const;
