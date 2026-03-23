## Review

**Completed:** 2026-03-23

**What was implemented:**
- `isTypeLocked()` helper added to all three exercise components, calling `stats.getMedalLevel()` with the correct key prefix per component (`addition`/`subtraction`/etc. for math, `clock-<type>` for clock reading, `clock-setClock-<type>` for set-clock)
- `toggleType()` in each component now guards deselection: locked types cannot be removed from the active set in practice mode
- Each type button gets `[class.locked]`, `[title]` tooltip, and a `🔒` icon when locked
- CSS `.locked` style added to all three SCSS files: 60% opacity + `cursor: not-allowed` + hover suppression
- Time trial mode is unaffected in all components
- Sachaufgaben (word problems) excluded — no per-type stats tracking there

**Deviations from plan:**
- None