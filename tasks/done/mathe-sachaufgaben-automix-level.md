# Mathe/Sachaufgaben Auto-Mix + unified status card

## Goal

Practice on Mathe-Übung and Sachaufgaben always auto-mixes types (no selectors). Sachaufgaben get adaptive difficulty. Shared `exercise-status-card` (optional difficulty + Serie/Beste + Heute) for Mathe tiles; landscape: task left-top, status left-bottom, keypad right. Bronze remains achievements-only.

Plan: Cursor `auto-level_mathe_mix`.

## Checklist

- [x] Shared `exercise-status-card` + unit tests
- [x] `wordProblems` difficulty type
- [x] Mathe-Übung: hide practice type selector, auto-mix, status card, landscape
- [x] Sachaufgaben: levels, status card, no selector, landscape
- [x] Migrate Zahlenreihen to status card
- [x] Update `streak-stats-ui-unify` pointer
- [x] Browser-test (iPad landscape)
- [x] E2E + full suite
- [x] README + todo.md

## Review

**Completed:** 2026-11-20

**Shipped:**
- Shared `app-exercise-status-card` (optional difficulty + Serie/Beste always blue/white + Heute badges)
- Mathe-Übung practice always auto-mixes +/−/×/÷ (no type selector; Zeitrennen keeps radios; Einmaleins chips stay)
- Sachaufgaben adaptive `wordProblems` levels L1–5 (ZR20 → ZR100 → two-step mix → ZR1000) via `DifficultyService`
- Zahlenreihen / Übung / Sachaufgaben unified shell: title → task-card → status → keypad; landscape 2-column; bright-blue accents
- E2E + unit tests updated; `streak-stats-ui-unify` pointed at status card for Uhrzeit/Deutsch follow-up

**Deviations:**
- Layout polish (task-card shell + color unify + always-blue Serie/Beste) added after initial wire-up, still in scope of the shared card goal
- Keypad OK button switched from pink/purple gradient to bright-blue (shared component; affects all exercises)
