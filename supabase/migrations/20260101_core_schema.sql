-- Core schema: users and all statistics tables
-- Created retroactively from the manually created tables in Supabase dashboard

-- ============================================================================
-- USERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username       text NOT NULL UNIQUE,
  avatar_style   text NOT NULL DEFAULT 'adventurer',
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- DAILY STATS
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_stats (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date            date NOT NULL,
  stats_by_type   jsonb NOT NULL DEFAULT '{}',
  math_daily_goal int NOT NULL DEFAULT 20,
  clock_daily_goal int NOT NULL DEFAULT 20,
  vocab_daily_goal int DEFAULT 10,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

-- ============================================================================
-- LIFETIME STATS
-- ============================================================================

CREATE TABLE IF NOT EXISTS lifetime_stats (
  user_id              uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stats_by_type        jsonb NOT NULL DEFAULT '{}',
  best_streaks_by_type jsonb NOT NULL DEFAULT '{}',
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- TIME TRIAL PERSONAL BESTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS time_trial_bests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_types text[] NOT NULL,
  correct_count  int NOT NULL DEFAULT 0,
  total_count    int NOT NULL DEFAULT 0,
  accuracy       numeric(5,2) NOT NULL DEFAULT 0,
  achieved_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_types)
);

-- ============================================================================
-- MULTIPLICATION MASTERY
-- ============================================================================

CREATE TABLE IF NOT EXISTS multiplication_mastery (
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reihe          int NOT NULL CHECK (reihe BETWEEN 1 AND 10),
  current_streak int NOT NULL DEFAULT 0,
  mastered       boolean NOT NULL DEFAULT false,
  mastered_at    timestamptz,
  PRIMARY KEY (user_id, reihe)
);

-- ============================================================================
-- DAILY STREAKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_streaks (
  user_id            uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak     int NOT NULL DEFAULT 0,
  longest_streak     int NOT NULL DEFAULT 0,
  last_practice_date date,
  streak_milestones  int[] NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- BADGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_badges (
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id  text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- ============================================================================
-- COINS
-- ============================================================================

CREATE TABLE IF NOT EXISTS coin_balances (
  user_id     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance     int NOT NULL DEFAULT 0,
  total_earned int NOT NULL DEFAULT 0,
  total_spent  int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount     int NOT NULL,
  reason     text NOT NULL,
  related_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- GAME SCORES
-- ============================================================================

CREATE TABLE IF NOT EXISTS game_scores (
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id      text NOT NULL,
  high_score   int NOT NULL DEFAULT 0,
  times_played int NOT NULL DEFAULT 0,
  last_played_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game_id)
);
