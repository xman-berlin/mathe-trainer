## Review

**Completed:** 2026-03-23

**What was implemented:**
- `lockedTypes` computed signal added to all three exercise components, reading `stats.lifetimeStatsByType()` directly so Angular OnPush change detection tracks the dependency reactively
- `toggleType()` in each component guards deselection: locked types (< 100 lifetime correct) cannot be removed from the active set in practice mode
- Each type button uses `lockedTypes().has(type)` directly in the template for `[class.locked]`, `[title]` tooltip, and `@if` lock icon — avoids plain method call bypassing signal tracking
- `isTypeLocked()` helper kept as a convenience method internally (calls `lockedTypes().has(type)`)
- CSS `.locked` style added to all three SCSS files: 60% opacity + `cursor: not-allowed` + hover suppression + `🔒` icon
- Time trial mode is unaffected in all components
- Sachaufgaben (word problems) excluded — no per-type stats tracking there

**Deviations from plan:**
- Original implementation used `stats.getMedalLevel()` (plain method) — replaced with `lockedTypes` computed signal reading `lifetimeStatsByType()` directly, which is required for OnPush reactivity
- Logic was inverted from initial implementation: lock is active when bronze NOT yet reached, disappears once earned
- `set-clock-exercise.html` was the last file updated to use `lockedTypes().has(type)` directly (was still using `isTypeLocked()` method calls)