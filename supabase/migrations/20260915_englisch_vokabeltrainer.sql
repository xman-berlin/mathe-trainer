-- Englisch vocab trainer: language seed, pair columns, daily goal

INSERT INTO vocab_languages (name, speech_lang)
VALUES ('Englisch', 'en-GB')
ON CONFLICT (name) DO UPDATE SET speech_lang = EXCLUDED.speech_lang;

ALTER TABLE vocab_list_words
  ADD COLUMN IF NOT EXISTS prompt_en text,
  ADD COLUMN IF NOT EXISTS answer_de text,
  ADD COLUMN IF NOT EXISTS context_en text;

-- English pairs may leave legacy `word` empty; Deutsch keeps using `word`.
ALTER TABLE vocab_list_words ALTER COLUMN word DROP NOT NULL;

ALTER TABLE daily_stats
  ADD COLUMN IF NOT EXISTS englisch_daily_goal int DEFAULT 10;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS englisch_daily_goal int DEFAULT 10;
