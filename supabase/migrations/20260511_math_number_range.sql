-- Add math_number_range column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS math_number_range integer NOT NULL DEFAULT 100;
