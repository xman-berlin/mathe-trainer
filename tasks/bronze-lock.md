# Lock Exercise Types at Bronze Level

## Goal
Exercise type toggles become non-deselectable in practice mode once a user
reaches ≥100 lifetime correct answers (bronze) for that type. Applies to
math, clock-reading, and set-clock exercises. Time trial is unaffected.

## Key Decisions
- Lock threshold: bronze = ≥100 lifetime correct for that specific type
- Visual: reduced opacity + `🔒` inside button + `cursor: not-allowed`
- Tooltip: "Du hast Bronze erreicht – diese Rechenart ist immer dabei!"
- Time trial: no locking (radio-select behavior unchanged)
- Medal key mapping:
  - Math: `addition`, `subtraction`, `multiplication`, `division`
  - Clock read: `clock-full`, `clock-half`, `clock-quarter`, `clock-fiveMin`
  - Clock set: `clock-setClock-full`, `clock-setClock-half`, `clock-setClock-quarter`, `clock-setClock-fiveMin`

## Tasks

- [ ] `exercise.component.ts` — add `isTypeLocked()` helper; guard deselect in `toggleType()`
- [ ] `exercise.component.html` — add `[disabled]`, `[class.locked]`, `[title]`, `🔒` span on type buttons
- [ ] `exercise.component.scss` — add `.type-toggle.locked` style
- [ ] `clock-exercise.ts` — same pattern with `clock-` stats key prefix
- [ ] `clock-exercise.html` — lock attributes on practice-mode type buttons only
- [ ] `clock-exercise.scss` — add `.type-btn.locked` style
- [ ] `set-clock-exercise.ts` — same pattern with `clock-setClock-` prefix
- [ ] `set-clock-exercise.html` — lock attributes on type buttons
- [ ] `set-clock-exercise.scss` — add `.type-btn.locked` style
- [ ] Run `npm run lint && npm run build` — verify no errors
