-- Move daily goals from daily_stats to users table
-- Goals are user preferences, not daily counters.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS math_daily_goal  int NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS clock_daily_goal int NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS vocab_daily_goal int NOT NULL DEFAULT 20;
