# Vocabulary Module (Vokabeltrainer)

## Goal
Add a new "Vokabeln" category to Schlaufuchs. Children hear a word spoken aloud
(Web Speech API) and must type it correctly using a custom QWERTZ keyboard.
Word lists are managed by an admin, are fully CRUD-able, and assigned per user.
Wrong answers appear more often than correct ones (simple weight-based repetition).
Fully integrated with coins, medals, daily goals, and streaks.

---

## Architecture

### Exercise flow
- App speaks a word in the target language (e.g. English)
- Child types the spelling using the on-screen QWERTZ keyboard
- Correct → green feedback, word weight decreases, next word after 1s
- Wrong → red feedback, correct spelling shown, word weight increases, next word after 2s
- Stats recorded as `vocab-<languagename>` (e.g. `vocab-englisch`)

### Word weighting
- New word initial weight: 3
- Correct answer: `weight = max(1, weight - 1)`
- Wrong answer: `weight = weight + 2`
- Session queue: words repeated proportionally to their weight
- Newest assigned list is "active"; older lists included with words capped at weight 1

### Word list model
- Lists are named freely (e.g. 'Tiere', 'KW12'); default name = first word
- Lists belong to a language; words inside are fully CRUD-able
- Lists are assigned to specific users (one or many)
- Most recently assigned list drives the session; older lists resurface occasionally

---

## Supabase Schema (5 new tables + 1 new column)

```sql
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

-- Also: ADD COLUMN vocab_daily_goal int DEFAULT 10 TO daily_stats
```

---

## Tasks

### Phase 1 — Supabase schema
- [ ] Create `vocab_languages` table
- [ ] Create `vocab_lists` table
- [ ] Create `vocab_list_words` table
- [ ] Create `vocab_user_assignments` table
- [ ] Create `vocab_word_progress` table
- [ ] Add `vocab_daily_goal int DEFAULT 10` column to `daily_stats`

### Phase 2 — Data layer
- [ ] Create `src/app/models/vocab.model.ts`
      — interfaces: `VocabLanguage`, `VocabList`, `VocabWord`, `VocabAssignment`, `VocabWordProgress`, `VocabSessionWord`
- [ ] Add vocab CRUD to `src/app/services/supabase.service.ts`
      — `getVocabLanguages()`, `createVocabLanguage()`, `deleteVocabLanguage()`
      — `getVocabListsForLanguage()`, `createVocabList()`, `updateVocabList()`, `deleteVocabList()`
      — `getVocabListWords()`, `addVocabWord()`, `updateVocabWord()`, `deleteVocabWord()`
      — `getVocabAssignmentsForUser()`, `assignListToUser()`, `unassignListFromUser()`
      — `getWordProgressForUser()`, `upsertWordProgress()`
- [ ] Create `src/app/services/vocab.service.ts`
      — signals: `languages`, `lists`, `assignments`
      — `loadUserData(userId)` / `clearUserData()`
      — `buildSession(userId, languageId): VocabSessionWord[]`
      — `updateWordWeight(userId, wordId, correct)`

### Phase 3 — Stats integration
- [ ] Update `src/app/models/stats.model.ts` — add `vocab_daily_goal: number` to `DailyStats`
- [ ] Update `src/app/services/stats.service.ts`
      — add `vocabCorrectCount` computed (sums all `vocab-*` keys from `statsByType()`)
      — add `currentVocabGoal` signal (default: 10) + `setVocabDailyGoal()`
      — add `isVocabGoalReached` computed
      — extend `checkDailyGoalBonus()` to handle vocab goal
- [ ] Update `src/app/services/supabase.service.ts` — include `vocab_daily_goal` in `daily_stats` upsert
- [ ] Wire `VocabService.loadUserData()` / `clearUserData()` into `src/app/services/auth.service.ts`

### Phase 4 — QWERTZ keyboard component
- [ ] Create `src/app/components/shared/letter-keypad/letter-keypad.component.ts`
      — `@Input() value: Signal<string>`, `@Output() valueChange`, `@Output() keypadSubmit`, `@Output() replayAudio`
      — Rows: `[Q W E R T Z U I O P]` / `[A S D F G H J K L]` / `[Y X C V B N M]` / `[Ä Ö Ü ß]`
      — Extra keys: `⌫` delete, `OK` submit (disabled when empty)
      — `@HostListener('keydown')` for physical keyboard (letters, Backspace, Enter)
- [ ] Create `letter-keypad.component.html`
- [ ] Create `letter-keypad.component.scss`

### Phase 5 — Vocab exercise component
- [ ] Create `src/app/components/vocab-exercise/vocab-exercise.ts`
      — Route receives `?lang=<languageId>` query param
      — `providers: [ExerciseStateService]`
      — On init: `VocabService.buildSession()`, auto-play first word
      — `playWord()` via `SpeechSynthesisUtterance` with language `speech_lang`
      — Submit: case-insensitive + trim comparison
      — On answer: `stats.recordResult()` + `vocabService.updateWordWeight()`
      — Full `ExerciseStateService` wiring (streak, milestones, confetti)
- [ ] Create `vocab-exercise.html`
      — Language name header, "Schreibe das Wort:" label
      — Readonly answer display input
      — `app-letter-keypad` with `(replayAudio)="playWord()"`
      — Feedback area, streak display, milestone popup, result summary
- [ ] Create `vocab-exercise.scss`

### Phase 6 — Category overview
- [ ] Create `src/app/components/vocab-category-overview/vocab-category-overview.ts`
      — One card per language
      — Each card links to `/vokabeln/uebung?lang=<id>`
      — Today's correct/total + daily goal progress bar
      — "Verwalten" button linking to `/vokabeln/verwalten`
- [ ] Create `vocab-category-overview.html`
- [ ] Create `vocab-category-overview.scss`

### Phase 7 — Management UI
- [ ] Create `src/app/components/vocab-management/vocab-management.ts`
      — Left panel: language list + list tree (create/rename/delete lists)
      — Right panel: word table with inline add/edit/delete + user assignment checkboxes
      — New list name defaults to first word if left blank
- [ ] Create `vocab-management.html`
- [ ] Create `vocab-management.scss`

### Phase 8 — Routing + home dashboard
- [ ] Update `src/app/app.routes.ts`
      — `/vokabeln` → `VocabCategoryOverviewComponent` (canActivate: authGuard)
      — `/vokabeln/uebung` → `VocabExerciseComponent` (canActivate: authGuard)
      — `/vokabeln/verwalten` → `VocabManagementComponent` (canActivate: authGuard)
- [ ] Update `src/app/components/category-home/category-home.ts`
      — Add `vocabCorrectCount`, `vocabGoalProgressPercent`, `isVocabGoalReached`
      — Add `editVocabGoal()` / `saveVocabGoal()` / `cancelVocabGoalEdit()`
- [ ] Update `src/app/components/category-home/category-home.html`
      — Add vocab category card (icon 📖, routerLink="/vokabeln")
      — Add vocab goal editor modal

### Phase 9 — Verification
- [ ] Run `npm run lint` — fix all errors
- [ ] Run `npm run build` — fix all errors
- [ ] Run `npm run test -- --watch=false` — fix any failing tests
- [ ] Manual smoke test: create language → create list → add words → assign to user → open exercise → speak/type words → verify weight changes → verify coins/streak awarded
