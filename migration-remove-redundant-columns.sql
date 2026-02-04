-- Migration: Remove redundant correct/incorrect columns from daily_stats
--
-- The correct and incorrect columns are redundant since all stats are tracked
-- in the stats_by_type JSONB column. This migration removes them to simplify
-- the schema and prevent data inconsistencies.
--
-- Run this in your Supabase SQL Editor to update the database schema

-- Remove the correct column from daily_stats table
ALTER TABLE daily_stats
DROP COLUMN IF EXISTS correct;

-- Remove the incorrect column from daily_stats table
ALTER TABLE daily_stats
DROP COLUMN IF EXISTS incorrect;

-- The stats_by_type column now serves as the single source of truth for all statistics
