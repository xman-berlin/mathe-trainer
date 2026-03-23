# Minute Ticks on Interactive Clock

## Goal
The interactive clock in the "Zeiger setzen" exercise should show the 60
minute tick marks between the hour numbers, so children can precisely
position the minute hand.

## Key Decisions
- 60 tick marks total; the 12 hour positions already have numbers, so ticks
  at those positions can be skipped or rendered shorter (they sit behind the numbers)
- Hour positions (every 5 minutes): longer/thicker tick
- Intermediate positions (every 1 minute): shorter/thinner tick
- Ticks are purely visual SVG lines radiating inward from the clock rim
- No TypeScript changes needed — pure HTML + SCSS

## Tasks

- [x] Add `minuteTickMarks` array (0–59) and `getMinuteTick()` / `isHourTick()` to `interactive-clock-display.ts`
- [x] Render tick marks in `interactive-clock-display.html` before hour numbers (replaced old dot markers)
- [x] Style ticks in `interactive-clock-display.scss` — thin grey for minute ticks, slightly thicker/darker for hour positions
- [x] Run `npm run build` — no errors

## Review

**Completed:** 2026-03-23

**What was implemented:**
Added 60 SVG tick marks to the interactive clock face in the "Zeiger setzen" exercise. Hour positions (every 5 ticks) render as slightly thicker and darker lines; the 55 intermediate minute positions render as thin light-grey lines. The old dot markers at hour positions were replaced entirely.

**Deviations from plan:**
Minor — TypeScript changes were needed (contrary to the original "No TypeScript changes needed" note) to generate the tick mark data array and helper methods. Otherwise implemented exactly as planned.
