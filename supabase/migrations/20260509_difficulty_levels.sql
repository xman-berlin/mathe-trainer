-- Add difficulty_levels JSONB column to users table
-- Stores per-type difficulty state: level, streak, recentResults
-- Shape: { "addition": { "level": 3, "streak": 2, "recentResults": [true, false, ...] }, ... }

ALTER TABLE users
ADD COLUMN IF NOT EXISTS difficulty_levels jsonb DEFAULT '{}'::jsonb;
