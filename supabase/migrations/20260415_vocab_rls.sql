-- Enable RLS on all vocab tables that were missing it.
-- Consistent with the project-wide pattern: permissive USING (true) policies,
-- since the app relies on application-level user_id filtering rather than
-- database-enforced ownership (no Supabase Auth used).

ALTER TABLE vocab_languages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_lists         ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_list_words    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_user_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_word_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to vocab_languages"
  ON vocab_languages FOR ALL USING (true);

CREATE POLICY "Allow all access to vocab_lists"
  ON vocab_lists FOR ALL USING (true);

CREATE POLICY "Allow all access to vocab_list_words"
  ON vocab_list_words FOR ALL USING (true);

CREATE POLICY "Allow all access to vocab_user_assignments"
  ON vocab_user_assignments FOR ALL USING (true);

CREATE POLICY "Allow all access to vocab_word_progress"
  ON vocab_word_progress FOR ALL USING (true);
