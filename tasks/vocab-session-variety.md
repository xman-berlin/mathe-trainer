# Fix: Vocab session variety (Rechtschreibung + Wörter Raten)

## Problem

On production, Rechtschreibung and Hangman often feel stuck on the same few words.
Root cause: Phase 1 drops all weight-1 words, leaving a tiny residual hard-word set that is
then multiplied by weight (up to 5×). Hangman never rebuilds that queue; Rechtschreibung
can show the same word consecutively after weighted expand + shuffle.

## Goal

Keep spaced-repetition bias for hard words, but prevent the session from collapsing to
2–4 unique words and reduce immediate repeats.

## Approach

1. **Phase 1 minimum unique floor** (`MIN_PHASE1_UNIQUE_WORDS = 8`): after selecting
   weight > 1 words from the active list, fill with weight-1 active words (at weight 1)
   until the floor or the list is exhausted.
2. **Adjacent spacing in `buildWeightedQueue`**: after shuffle, swap adjacent duplicates
   when another candidate exists later in the queue.
3. **Rechtschreibung**: skip consecutive identical `wordId` (same idea as Hangman).
4. **Hangman**: when the queue is exhausted, rebuild via `buildSession` instead of wrapping
   to index 0 (still no weight updates).

## Out of scope

- Persist plan / DB schema changes
- Hangman weight updates (remain disabled by design)
- Changing wrong-answer weight delta (+2)

## Implementation

- [x] `DeutschService.buildSession` Phase 1 fill + queue spacing
- [x] Unit tests for floor + spacing
- [x] Rechtschreibung consecutive skip
- [x] Hangman queue rebuild on exhaustion
- [x] Browser-test Rechtschreibung + Hangman locally
- [x] Full suite (`lint`, `build`, `test`, e2e if touched)
