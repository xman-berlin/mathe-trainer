# Tagesziele pro Übung

## Goal

Daily goals become configurable **per exercise tile** (not only per category), for all four home categories.

### Defaults (locked)

| Category | Exercise | Tagesziel |
|----------|----------|-----------|
| Mathe | Übung | 15 |
| Mathe | Sachaufgaben | 5 |
| Uhrzeit | Übung | 10 |
| Uhrzeit | Zeiger setzen | 5 |
| Uhrzeit | Zeitpunkte & Zeitspannen | 5 |
| Deutsch | Rechtschreibung | 10 |
| Deutsch | Wochentage | 5 |
| Deutsch | Monate | 5 |
| Deutsch | Alphabet | 5 |
| Englisch | Übersetzung | 20 |

**Out:** Hangman (game), Zeitrennen, Verwalten, Erfolge.

Home category cards show **sum** of that category’s tile goals; progress uses catalog stats keys only (Hangman excluded).

## Status quo (before)

- One goal number per category: `math_daily_goal`, `clock_daily_goal`, `vocab_daily_goal`, `englisch_daily_goal`
- Editors on home / category overview set that single number

## Relation to Übungsplan

[`tasks/uebungsplan-konfiguration.md`](../uebungsplan-konfiguration.md) stays independent. Shared catalog: [`src/app/models/practice-exercise.catalog.ts`](../../src/app/models/practice-exercise.catalog.ts).

## Product decisions

| Topic | Decision |
|-------|----------|
| Granularity | Per catalog exercise tile |
| Hangman | No daily goal |
| Home | Roll-up sum for display; **reached only when every tile goal is met** (overflow on one tile does not count toward another); green check + „Geschafft!“ when all done |
| Config UI | Category overview ⚙️ modal listing that category’s tiles |
| Home editors | Removed |
| Coins | 1× 10 Münzen / Kategorie / Tag on roll-up reached |
| Persistence | `users.daily_goals_by_exercise` jsonb + localStorage |
| Clamp | 1–100 per tile |
| Defaults | Table above (not split from old category goal) |

## Implementation checklist

- [x] `PRACTICE_EXERCISE_CATALOG` + stats-key mapping
- [x] SQL migration `daily_goals_by_exercise`
- [x] `StatsService` goals map, roll-up, coin bonus
- [x] Category / Deutsch / Englisch overview multi-tile editor
- [x] Home roll-up + goal-done celebration; remove home goal editors
- [x] Unit / E2E / browser check
- [x] Full suite

## Review

**Completed:** 2026-09-29

### What shipped
- Shared `PRACTICE_EXERCISE_CATALOG` with per-tile defaults and stats-key mapping
- `users.daily_goals_by_exercise` jsonb (migration + Supabase load/save + localStorage)
- `StatsService` per-exercise goals; category roll-up display as sum; **reached only when every tile goal is met** (capped per tile); coin bonus on category complete
- Goal editors on Mathe / Uhrzeit / Deutsch / Englisch overviews (multi-tile modal); home editors removed
- Home + category tiles: neutral gray border when incomplete, green when goal done; soft category wash kept
- Hangman excluded from goals; homepage Übungsplan CTA remains removed
- Related in same ship: +/− max level Löwe (5) reine Hunderter; discard incompatible pending math problems

### Deviations from plan
- Roll-up “reached” is AND-of-tiles (not sum overflow), clarified during implementation
- Border colors repurposed for goal status (plan mentioned green check only)
- Catalog also shared with Übungsplan task (independent feature still open)

### Deploy note
Apply `supabase/migrations/20260928_daily_goals_by_exercise.sql` on the remote project if not already.
