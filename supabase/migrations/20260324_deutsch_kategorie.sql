-- Deutsch-Kategorie migration
-- Makes language_id optional on vocab_lists so lists can be created without a language.
-- Run this in the Supabase SQL editor before deploying the Deutsch-Kategorie frontend.

ALTER TABLE vocab_lists ALTER COLUMN language_id DROP NOT NULL;
