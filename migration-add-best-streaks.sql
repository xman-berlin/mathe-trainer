-- Migration: Add best_streaks_by_type to lifetime_stats
--
-- This migration adds a new JSONB column to track best streaks per exercise type
-- Run this in your Supabase SQL Editor to update the database schema

-- Add the best_streaks_by_type column to lifetime_stats table
ALTER TABLE lifetime_stats
ADD COLUMN IF NOT EXISTS best_streaks_by_type JSONB DEFAULT '{}'::jsonb;

-- Add a comment describing the column
COMMENT ON COLUMN lifetime_stats.best_streaks_by_type IS 'Record<exerciseType, best_streak> - Tracks the best streak for each exercise type';

-- The column is now available and will be populated automatically as users achieve new best streaks
