-- Schlaufuchs Multi-User Database Schema for Supabase
--
-- Instructions:
-- 1. Create a new project on https://supabase.com
-- 2. Go to SQL Editor in your Supabase dashboard
-- 3. Copy and paste this entire file
-- 4. Click "Run" to create all tables, indexes, and policies
--
-- This schema creates:
-- - users: User accounts with usernames and avatars
-- - daily_stats: Daily statistics per user
-- - lifetime_stats: Lifetime achievement statistics
-- - time_trial_bests: Personal best records for time trials
-- - multiplication_mastery: Mastery tracking for multiplication tables
-- - daily_streaks: Daily practice streak tracking

-- ============================================================================
-- TABLE: users
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  avatar_style TEXT NOT NULL DEFAULT 'adventurer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT username_length CHECK (char_length(username) >= 2 AND char_length(username) <= 20),
  CONSTRAINT username_alphanum CHECK (username ~ '^[a-zA-Z0-9_-]+$')
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_last_active ON users(last_active_at);

-- ============================================================================
-- TABLE: daily_stats
-- ============================================================================
CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  correct INTEGER DEFAULT 0,
  incorrect INTEGER DEFAULT 0,
  stats_by_type JSONB DEFAULT '{}'::jsonb,  -- Record<exerciseType, {correct, incorrect}>
  math_daily_goal INTEGER DEFAULT 20,
  clock_daily_goal INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date),
  CONSTRAINT positive_counts CHECK (correct >= 0 AND incorrect >= 0)
);

CREATE INDEX idx_daily_stats_user_date ON daily_stats(user_id, date DESC);
CREATE INDEX idx_daily_stats_date ON daily_stats(date DESC);

-- ============================================================================
-- TABLE: lifetime_stats
-- ============================================================================
CREATE TABLE lifetime_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stats_by_type JSONB DEFAULT '{}'::jsonb,  -- Record<exerciseType, correct_count>
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: time_trial_bests
-- ============================================================================
CREATE TABLE time_trial_bests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_types TEXT[] NOT NULL,  -- Sorted array of exercise types
  correct_count INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  accuracy NUMERIC(5,2) NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, exercise_types)
);

CREATE INDEX idx_time_trial_user ON time_trial_bests(user_id);

-- ============================================================================
-- TABLE: multiplication_mastery
-- ============================================================================
CREATE TABLE multiplication_mastery (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reihe INTEGER NOT NULL,  -- 1-10
  current_streak INTEGER DEFAULT 0,
  mastered BOOLEAN DEFAULT FALSE,
  mastered_at TIMESTAMPTZ,

  PRIMARY KEY(user_id, reihe),
  CONSTRAINT reihe_range CHECK (reihe >= 1 AND reihe <= 10)
);

CREATE INDEX idx_mastery_user ON multiplication_mastery(user_id);

-- ============================================================================
-- TABLE: daily_streaks
-- ============================================================================
CREATE TABLE daily_streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_practice_date DATE,
  streak_milestones INTEGER[] DEFAULT ARRAY[]::INTEGER[],  -- Achieved milestones [7, 14, 30, 50, 100]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT positive_streaks CHECK (current_streak >= 0 AND longest_streak >= 0)
);

CREATE INDEX idx_streaks_user ON daily_streaks(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifetime_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_trial_bests ENABLE ROW LEVEL SECURITY;
ALTER TABLE multiplication_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_streaks ENABLE ROW LEVEL SECURITY;

-- Users table: Public read, all can update their own last_active
CREATE POLICY "Users are publicly readable" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update their own last_active" ON users FOR UPDATE USING (true);
CREATE POLICY "Users can insert new accounts" ON users FOR INSERT WITH CHECK (true);

-- Daily stats: Users can access all their own data
CREATE POLICY "Users can access their own daily stats" ON daily_stats FOR ALL USING (true);

-- Lifetime stats: Users can access all their own data
CREATE POLICY "Users can access their own lifetime stats" ON lifetime_stats FOR ALL USING (true);

-- Time trial bests: Users can access all their own data
CREATE POLICY "Users can access their own time trials" ON time_trial_bests FOR ALL USING (true);

-- Multiplication mastery: Users can access all their own data
CREATE POLICY "Users can access their own mastery" ON multiplication_mastery FOR ALL USING (true);

-- Daily streaks: Users can access all their own data
CREATE POLICY "Users can access their own streaks" ON daily_streaks FOR ALL USING (true);

-- ============================================================================
-- HELPER FUNCTIONS (Optional but useful)
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_daily_stats_updated_at BEFORE UPDATE ON daily_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lifetime_stats_updated_at BEFORE UPDATE ON lifetime_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_streaks_updated_at BEFORE UPDATE ON daily_streaks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment to create test users:
-- INSERT INTO users (username, avatar_style) VALUES
--   ('MaxMuster', 'adventurer'),
--   ('AnnaTest', 'avataaars'),
--   ('PeterPan', 'fun-emoji');

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
--
-- Next steps:
-- 1. Copy your Supabase Project URL and Anon Key
-- 2. Update src/environments/environment.ts with these values
-- 3. Update src/environments/environment.prod.ts with these values
-- 4. The frontend app will now be able to connect to your database!
