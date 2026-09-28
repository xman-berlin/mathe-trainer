# Unify exercise streak + daily stats UI (Sachaufgaben style)

## Goal

Bring **session streak** and **daily result summary** on all exercise pages in line with the Sachaufgaben reference UI (`Serie` / `Beste` + `✓ ✗ Σ Heute` badges).

Reference: [`word-problem-exercise.component.html`](../src/app/components/word-problem-exercise/word-problem-exercise.component.html) + styles in the same component SCSS.

## Out of scope

- Home / category **daily-login streak** (`app-streak-display` → Erfolge) — different product concept
- Time-trial personal bests („Dein Rekord: X richtig“) — keep as-is unless they share the same component by accident
- Difficulty tier chip / level-up progress dots on Mathe-Übung — separate from session streak

## Target style (reference)

### Session streak

```html
<div class="streak-display" [class.has-streak]="streak() > 0">
  <div class="streak-item">
    <span class="streak-label">Serie:</span>
    <span class="streak-value">{{ streak() }}</span>
  </div>
  <div class="streak-item">
    <span class="streak-label">Beste:</span>
    <span class="streak-value">{{ bestStreak() }}</span>
  </div>
</div>
```

- Labels: German `Serie` / `Beste` (not 🔥 + optional „Rekord:“)
- Always show both values (Beste can be 0)
- `has-streak` styling when `streak() > 0` (gradient treatment as in Sachaufgaben)

### Daily stats

```html
<div class="result-summary">
  <span class="badge badge-correct">✓ …</span>
  <span class="badge badge-incorrect">✗ …</span>
  <span class="badge badge-total">Σ …</span>
  <span class="summary-label">Heute</span>
</div>
```

Keep existing badge colors via shared SCSS (`_badges.scss` / `_exercise.scss`).

## Pages / components to update

| Area | Component | Notes |
|------|-----------|--------|
| Mathe Übung | `exercise` | Replace 🔥 + optional Rekord |
| Mathe Sachaufgaben | `word-problem-exercise` | **Reference** — only extract shared styles if needed |
| Uhrzeit Übung | `clock-exercise` | Practice mode streak + summary |
| Uhrzeit Zeiger setzen | `set-clock-exercise` | |
| Uhrzeit Zeitspannen | `time-span-exercise` | |
| Deutsch Rechtschreibung | `vocab-exercise` | |
| Deutsch Hangman | `hangman` | |
| Deutsch Sequences | `sequence-exercise` | Wochentage / Monate / Alphabet |
| Englisch Übersetzung | `englisch-uebung` | |

Optional shared pieces (prefer if duplication grows):

- `app-session-streak` — Serie / Beste markup + styles
- Reuse / harden `app-stats-badge` + `summary-label Heute` wrapper for `result-summary`

## Behaviour alignment (same as Sachaufgaben)

- Use `ExerciseStateService` for session `streak` / `bestStreak` where not already
- Persist **Beste** via `StatsService.getBestStreak` / `updateBestStreak` per exercise type key (Sachaufgaben already does `word-problems`; Mathe Übung currently does **not** — fix as part of this task)
- Document the stable type keys used for best-streak persistence

## Implementation checklist

- [ ] Agree shared markup (inline copy vs small shared components)
- [ ] Move / share streak + summary styles (prefer `src/styles/_exercise.scss` or a tiny shared component styleUrl)
- [ ] Update each exercise page in the table above
- [ ] Persist `bestStreak` for Mathe Übung (and any other page missing load/save)
- [ ] Landscape/portrait: no layout regressions (esp. Mathe 2-column landscape)
- [ ] Browser-test: Mathe Übung, Sachaufgaben, one Uhrzeit, one Deutsch, Englisch — streak + Heute look consistent
- [ ] Unit tests: shared component if introduced; otherwise adjust component specs that assert old 🔥 / Rekord markup
- [ ] Run full suite: `npm run lint && npm run build && npm run test -- --watch=false`

## Review

_(fill when done)_
