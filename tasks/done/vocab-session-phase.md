# Feature: Vocab Session Phase Logic + Weight Cap

## Goal
Prevent old high-weight words from dominating training sessions.
Prioritise the active (most recently assigned) list until it is mastered,
then expand to all lists. Cap weights at 5 everywhere — in session and in storage.

## Background / Context
- `vocab_word_progress.weight`: correct → `max(1, w-1)`, wrong → `w+2`, default 3
- Production has words with weights of 20+ (no cap existed before)
- Session queue is built by repeating each word `weight` times, then shuffling
- `vocab-exercise` calls `updateWordWeight` on every answer — correct behavior
- `hangman` currently calls `updateWordWeight` on win/loss — **must be removed**
- Queue is currently built once at session start and cycles endlessly

## Rules

### Weight cap
- Weights are capped at **5** both in storage and in the session queue
- In `updateWordWeight`: after computing new weight, clamp to `min(5, newWeight)`
- This means a word at weight 20 drops to 5 on the very next correct answer (not after 15 correct answers)
- Cap applies everywhere: active list, older lists, Phase 1, Phase 2

### Phase 1 — Active list focus
- Condition: **any** word in the most-recently-assigned list has stored weight > 1
- Session contains **only** active-list words
- Weights capped at 5

### Phase 2 — All lists
- Condition: **all** active-list words are at weight 1
- Session contains words from **all** assigned lists
- Weights capped at 5 for all words

### Phase transitions
- Wrong answer on **active-list** word in Phase 2 → weight 1→3 → Phase 1 kicks in immediately on next rebuild
- Wrong answer on **old-list** word in Phase 2 → weight goes up but Phase 1 condition unchanged → stays Phase 2

### Queue rebuild
- Queue is rebuilt after **every answer** in `vocab-exercise` (correct or incorrect)
- Phase transitions and weight changes take effect immediately
- Current word advances before rebuild (user doesn't see the same word twice in a row)

### Hangman
- Hangman uses the session queue for word selection only
- Hangman **does NOT update word weights** — remove both `updateWordWeight` calls
- Hangman still counts toward daily goal via `statsService.recordResult`
- Hangman queue does NOT need to be rebuilt after each answer (no weight changes)

## Affected Files
- `src/app/services/vocab.service.ts` — `buildSession()`, `updateWordWeight()`, `MAX_WORD_WEIGHT` constant
- `src/app/components/vocab-exercise/vocab-exercise.ts` — rebuild queue after each answer
- `src/app/components/hangman/hangman.ts` — remove `updateWordWeight` calls
- `src/app/services/vocab.service.spec.ts` — update/add tests
- `src/app/components/hangman/hangman.spec.ts` — update tests

## Implementation Plan

- [ ] Add `MAX_WORD_WEIGHT = 5` constant to `vocab.service.ts`
- [ ] Update `updateWordWeight()`: clamp `newWeight = Math.min(MAX_WORD_WEIGHT, newWeight)`
- [ ] Rewrite `buildSession()`:
  1. Sort assignments by `assigned_at` desc (active = index 0) — already done
  2. Load words for active list; read weights from progressMap
  3. Check if any active-list word has stored weight > 1
  4. If Phase 1: build queue from active-list words only, weights capped at 5
  5. If Phase 2: load words for all lists, cap all weights at 5, build combined queue
- [ ] `vocab-exercise`: after `updateWordWeight` resolves, call `buildSession` and reset queue; advance to next word first
- [ ] `hangman`: remove `updateWordWeight` calls from `handleWin()` and `handleLoss()`
- [ ] Update `vocab.service.spec.ts`:
  - Remove/update "cap weight at 1 for non-active lists" test → replace with Phase 1/2 tests
  - Add: Phase 1 when any active word weight > 1
  - Add: Phase 2 when all active words at weight 1
  - Add: weight cap at 5 in `updateWordWeight`
  - Add: wrong answer on old-list word stays in Phase 2
- [ ] Update `hangman.spec.ts`: verify `updateWordWeight` is no longer called on win/loss

## Review
_To be filled in after implementation_

## Review

### What was implemented
- `vocab.service.ts`: `MAX_WORD_WEIGHT = 5`; `updateWordWeight()` clamps stored value to 5; `buildSession()` rewritten with Phase 1 (active-list only when any active word weight > 1) / Phase 2 (all lists when all active words at weight 1)
- `vocab-exercise.ts`: queue rebuilt after each answer; `queueRebuilt` boolean flag so `advance()` resets to index 0 without double-incrementing
- `hangman.ts`: `updateWordWeight` calls removed from `handleWin()` and `handleLoss()`
- `hangman.spec.ts`: win/loss tests updated to assert `updateWordWeight` is NOT called
- `vocab.service.spec.ts`: Phase 1/2 logic tests and weight cap tests added

### Deviations from original plan
- None significant. All key decisions (weight cap on stored value, hangman no-weight-update, Phase 1 check on active-list only, `queueRebuilt` flag approach) were implemented as planned.

### Date completed
2026-05-08
