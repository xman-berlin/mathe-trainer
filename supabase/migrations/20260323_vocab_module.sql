-- Vocabulary module migration
-- Run this in the Supabase SQL editor to enable the Vokabeltrainer feature.

CREATE TABLE vocab_languages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,   -- e.g. 'Englisch'
  speech_lang text NOT NULL,          -- BCP-47, e.g. 'en-GB'
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE vocab_lists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_id uuid REFERENCES vocab_languages(id) ON DELETE CASCADE,
  name        text NOT NULL,          -- defaults to first word if not set
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE vocab_list_words (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES vocab_lists(id) ON DELETE CASCADE,
  word    text NOT NULL
);

CREATE TABLE vocab_user_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  list_id     uuid REFERENCES vocab_lists(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, list_id)
);

CREATE TABLE vocab_word_progress (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  word_id uuid REFERENCES vocab_list_words(id) ON DELETE CASCADE,
  weight  int NOT NULL DEFAULT 3,
  PRIMARY KEY (user_id, word_id)
);

ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS vocab_daily_goal int DEFAULT 10;
