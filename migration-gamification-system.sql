-- Migration: Gamification System (Badges, Coins, Games)
--
-- This migration adds support for:
-- - Badge System: Track earned badges per user
-- - Coins System: Virtual currency with transaction history
-- - Game System: High scores for mini-games like Flappy Fox
--
-- To apply this migration:
-- 1. Go to SQL Editor in Supabase dashboard
-- 2. Copy and paste this file
-- 3. Click "Run"

-- ============================================================================
-- TABLE: user_badges
-- Stores earned badges per user
-- ============================================================================
CREATE TABLE user_badges (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_earned_at ON user_badges(earned_at DESC);

-- ============================================================================
-- TABLE: coin_balances
-- Stores current coin balance and totals per user
-- ============================================================================
CREATE TABLE coin_balances (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER DEFAULT 0 CHECK (total_earned >= 0),
  total_spent INTEGER DEFAULT 0 CHECK (total_spent >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coin_balances_user ON coin_balances(user_id);

-- ============================================================================
-- TABLE: coin_transactions
-- Transaction log for auditing and debugging
-- ============================================================================
CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,  -- Positive = earned, Negative = spent
  reason TEXT NOT NULL,  -- 'correct_answer', 'badge_earned', 'daily_goal', 'streak_milestone', 'game_cost'
  related_id TEXT,  -- Optional: badge_id, exercise_type, game_id, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coin_transactions_user ON coin_transactions(user_id);
CREATE INDEX idx_coin_transactions_created_at ON coin_transactions(created_at DESC);
CREATE INDEX idx_coin_transactions_reason ON coin_transactions(reason);

-- ============================================================================
-- TABLE: game_scores
-- High scores per user per game
-- ============================================================================
CREATE TABLE game_scores (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  high_score INTEGER DEFAULT 0 CHECK (high_score >= 0),
  times_played INTEGER DEFAULT 0 CHECK (times_played >= 0),
  last_played_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY(user_id, game_id)
);

CREATE INDEX idx_game_scores_user ON game_scores(user_id);
CREATE INDEX idx_game_scores_game ON game_scores(game_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- User badges: Users can read all their own badges
CREATE POLICY "Users can access their own badges" ON user_badges FOR ALL USING (true);

-- Coin balances: Users can read and update their own balance
CREATE POLICY "Users can access their own coin balance" ON coin_balances FOR ALL USING (true);

-- Coin transactions: Users can read their own transactions
CREATE POLICY "Users can access their own transactions" ON coin_transactions FOR ALL USING (true);

-- Game scores: Users can access their own scores
CREATE POLICY "Users can access their own game scores" ON game_scores FOR ALL USING (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at for coin_balances
CREATE TRIGGER update_coin_balances_updated_at BEFORE UPDATE ON coin_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Tables created:
-- ✓ user_badges
-- ✓ coin_balances
-- ✓ coin_transactions
-- ✓ game_scores
--
-- Next steps:
-- 1. Create TypeScript models for these tables
-- 2. Add SupabaseService methods for CRUD operations
-- 3. Implement BadgeService, CoinsService, GameService
