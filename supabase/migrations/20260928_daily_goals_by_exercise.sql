-- Per-exercise daily goals (jsonb map: catalog id → target count)
-- Category columns math/clock/vocab/englisch_daily_goal remain for backward compatibility;
-- the app now treats daily_goals_by_exercise as source of truth and writes category sums as aliases.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS daily_goals_by_exercise jsonb NOT NULL DEFAULT '{}'::jsonb;
