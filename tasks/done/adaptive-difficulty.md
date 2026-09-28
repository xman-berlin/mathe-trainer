# Feature: Adaptive Difficulty for Math Exercises

## Goal
Each math exercise type (addition, subtraction, multiplication, division) gets its own
difficulty level. The level is computed from recent performance and persisted per user
in Supabase. The current level is shown in the Erfolge / medal card for each type.

---

## Stufen-Namen

| Stufe | Name | Emoji |
|-------|------|-------|
| 1 | Maus | 🐭 |
| 2 | Fuchs | 🦊 |
| 3 | Wolf | 🐺 |
| 4 | Adler | 🦅 |
| 5 | Löwe | 🦁 |
| 6 | Drache | 🐉 |

Division hat jetzt ebenfalls 6 Stufen (wie +/−/×): Maus → … → Drache.

Name + Emoji werden in den Erfolgen neben der Stufenzahl angezeigt:
z.B. `Stufe 3 / 6 — 🐺 Wolf`

---

## Difficulty Levels

### Addition & Subtraction (6 levels)

| Stufe | Name | Zahlenraum | Addition | Subtraktion |
|-------|------|-----------|----------|-------------|
| 1 | 🐭 Maus | 1–10 | kein Übertrag | kein Borgen |
| 2 | 🦊 Fuchs | 1–100 | kein Übertrag | kein Borgen |
| 3 | 🐺 Wolf | 1–100 | 10er-Übertrag | 10er-Borgen |
| 4 | 🦅 Adler | 1–100 | >10er-Übertrag | >10er-Borgen |
| 5 | 🦁 Löwe | 100–999 | reine Hunderter | reine Hunderter (800−300) **oder** ohne Unterschreitung (670−40) |
| 6 | 🐉 Drache | 100–999 | Zehner+Hunderter (Einer=0) | Zehnerunterschreitung (420−50) **oder** Hunderterunterschreitung (530−160) |

Default: Stufe 3 (🐺 Wolf)

Constraints:
- Subtraction: result always ≥ 0 (typically ≥ 1)
- Answers always ≤ 999 (3-digit keypad)
- Carries/borrows stay within the number range of the level

### Multiplikation (6 Stufen)

Klasse-3-Progression: zuerst Festigung des **kleinen Einmaleins**, dann **Zehner-Einmaleins**.

| Stufe | Name | Inhalt |
|-------|------|--------|
| 1 | 🐭 Maus | Kleines Einmaleins: 1–5 × 1–5 |
| 2 | 🦊 Fuchs | Kleines Einmaleins: 1–10 × 1–10 |
| 3 | 🐺 Wolf | Kleines Einmaleins: 2–10 × 2–10 |
| 4 | 🦅 Adler | Zehner-Einmaleins: 1–10 × 10…50 |
| 5 | 🦁 Löwe | Zehner-Einmaleins: 1–10 × 10…90 (z. B. 7 × 80 = 560) |
| 6 | 🐉 Drache | Zehner-Einmaleins: 2–10 × 20…90 |

Ergebnis immer eintippbar (≤ 999). Faktoren bei Zehner-Aufgaben werden zufällig getauscht (4 × 20 und 20 × 4).

Default: Stufe 2 (🦊 Fuchs)

### Division (6 Stufen, kein Rest)

Klasse-3-Progression analog zur Multiplikation: zuerst **kleines Einsdurcheins**, dann **Division mit Zehnerzahlen**.

| Stufe | Name | Inhalt |
|-------|------|--------|
| 1 | 🐭 Maus | Kleines Einsdurcheins: Divisor & Quotient 1–5 |
| 2 | 🦊 Fuchs | Kleines Einsdurcheins: Divisor & Quotient 1–10 |
| 3 | 🐺 Wolf | Kleines Einsdurcheins: Divisor & Quotient 2–10 |
| 4 | 🦅 Adler | Zehner-Division: Divisor 1–10, Quotient 10…50 (z. B. 240 ÷ 6 = 40) |
| 5 | 🦁 Löwe | Zehner-Division: Divisor 1–10, Quotient 10…90 (z. B. 560 ÷ 8 = 70) |
| 6 | 🐉 Drache | Zehner-Division: Divisor 2–10, Quotient 20…90 |

Dividenden und Ergebnisse bei Stufe 1–3 ≤ 100; bei Stufe 4–6 Dividend = Zehnerzahl, Quotient ≤ 999.

Default: Stufe 2 (🦊 Fuchs)

---

## Level Transition Rules

- **Level up**: 5 correct answers in a row for that type → level + 1 (capped at max)
- **Level down**: 3 out of last 5 wrong for that type → level - 1 (min level 1)
- Per-type tracking: each type has its own `streak` (consecutive correct) and
  `recentResults: boolean[]` (last 5 results, rolling window)
- In mixed mode (multiple types active), streak and window are tracked independently
  per type — a correct multiplication answer does not affect addition's streak

---

## Data Model

### New Supabase migration: `difficulty_levels` column on `users` table

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS difficulty_levels jsonb DEFAULT '{}'::jsonb;
```

Shape of the JSON value:
```json
{
  "addition":       { "level": 3, "streak": 2, "recentResults": [true, true, false, true, true] },
  "subtraction":    { "level": 3, "streak": 0, "recentResults": [] },
  "multiplication": { "level": 2, "streak": 5, "recentResults": [true, true, true, true, true] },
  "division":       { "level": 2, "streak": 1, "recentResults": [true] }
}
```

### TypeScript model addition (`user.model.ts`)

```typescript
export interface DifficultyState {
  level: number;
  streak: number;
  recentResults: boolean[];
}

export type DifficultyLevels = Partial<Record<'addition' | 'subtraction' | 'multiplication' | 'division', DifficultyState>>;
```

Add `difficulty_levels?: DifficultyLevels` to the `User` interface.

---

## New Service: `DifficultyService`

**File**: `src/app/services/difficulty.service.ts`

Responsibilities:
- Hold in-memory signal of current difficulty state (all 4 types)
- Load from Supabase `users.difficulty_levels` on login
- Expose `getLevel(type)` as a computed signal
- Handle `recordResult(type, correct)`: update streak + recentResults, trigger level change if threshold met
- Debounced persist to Supabase after each answer (300ms debounce to batch rapid answers)
- Expose `resetToDefaults()` for testing

Defaults (used when no persisted value):
```typescript
const DEFAULTS: Record<OperationType, DifficultyState> = {
  addition:       { level: 3, streak: 0, recentResults: [] },
  subtraction:    { level: 3, streak: 0, recentResults: [] },
  multiplication: { level: 2, streak: 0, recentResults: [] },
  division:       { level: 2, streak: 0, recentResults: [] },
};
```

---

## Updated `ProblemGeneratorService`

Replace the current hardcoded number-range logic with level-aware generators.

### `generateAddition(level: number): Problem`
| Level | a range | b range | carry constraint |
|-------|---------|---------|-----------------|
| 1 | 1–9 | 1–(10-a) | none (a+b ≤ 10) |
| 2 | 1–99 | 1–(100-a), no carry | a%10 + b ≤ 9 |
| 3 | 1–99 | such that a+b crosses one 10 boundary | (a%10)+b > 10, a+b ≤ 100 |
| 4 | 1–99 | any, a+b crosses >1 boundary | a+b ≤ 100 |
| 5 | 1–999 | 10er carry, result ≤ 1000 | one carry |
| 6 | 1–999 | >10er carry, result ≤ 1000 | multi carry |

### `generateSubtraction(level: number): Problem`
Mirror of addition, result always ≥ 1.

### `generateMultiplication(level: number): Problem`
Pick factor ranges per level table above. Remove `allowedNumbers` parameter
(replaced by level — the existing ×/÷ number filter checkboxes are kept for now
but level takes priority for range).

### `generateDivision(level: number): Problem`
Pick dividend and divisor ranges per level table above. Result always integer ≥ 1.

---

## Changes to `exercise.component.ts`

- Inject `DifficultyService`
- In `generateProblem()`: pass current level for each type when calling the generator
- After answer submission: call `difficultyService.recordResult(type, isCorrect)`
- Remove the old hardcoded `generateAddition/Subtraction/Multiplication/Division`
  dispatch that uses no level parameter (already in `ProblemGeneratorService`)

---

## Changes to `supabase.service.ts`

Add:
```typescript
async updateDifficultyLevels(userId: string, levels: DifficultyLevels): Promise<void>
async getDifficultyLevels(userId: string): Promise<DifficultyLevels | null>
```

---

## UI: Level Display in Medal Cards (`achievements.component.html`)

In the math medal card loop, add below `<div class="medal-status">`:

```html
@if (isCoreType(type.key)) {
  <div class="difficulty-level">
    Stufe {{ getDifficultyLevel(type.key) }} / {{ getMaxLevel(type.key) }}
    — {{ getDifficultyEmoji(type.key) }} {{ getDifficultyName(type.key) }}
  </div>
}
```

`isCoreType` returns true for addition/subtraction/multiplication/division (not Sachaufgaben).

Add `getDifficultyLevel(type)`, `getMaxLevel(type)`, `getDifficultyName(type)`,
and `getDifficultyEmoji(type)` to `AchievementsComponent`, reading from `DifficultyService`.

Add a small CSS rule for `.difficulty-level` — muted text, smaller font, below medal status.

---

## Migration

**File**: `supabase/migrations/YYYYMMDD_difficulty_levels.sql`

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS difficulty_levels jsonb DEFAULT '{}'::jsonb;
```

Apply locally via `supabase db push`, then manually on production.

---

## Implementation Order

- [ ] Write migration + apply locally
- [ ] Add `DifficultyState` / `DifficultyLevels` to `user.model.ts`
- [ ] Add `getDifficultyLevels` / `updateDifficultyLevels` to `supabase.service.ts`
- [ ] Create `difficulty.service.ts` with load / recordResult / persist
- [ ] Rewrite `ProblemGeneratorService` generators with level parameter
- [ ] Update `exercise.component.ts` to use level + record results
- [ ] Add level display to `achievements.component.html` + CSS
- [ ] Write unit tests for `DifficultyService` (level up/down transitions)
- [ ] Write unit tests for updated `ProblemGeneratorService` (number ranges per level)
- [ ] Apply migration to production
- [ ] Lint + build + test → commit + push

---

## Key Decisions
- `difficulty_levels` stored as JSONB on `users` table — no new table needed
- Level tracked per type, independent in mixed mode
- `allowedNumbers` filter (×/÷ checkboxes) kept but superseded by level range
- Sachaufgaben excluded from level system (different generator, separate component)
- No UI to manually set level — only performance-driven
- Level persisted to Supabase; falls back to defaults if no value stored

## Review

### What was implemented
- `DifficultyService` with per-type level signals, `recordResult()` for streak/window logic, `getTierForLevel()`, and transient `lastLevelUp`/`lastLevelDown` signals
- `ProblemGeneratorService` fully rewritten with level-parameterised number ranges (6 levels for +/−/×, 4 for ÷)
- Supabase persistence: `difficulty_levels` JSONB column on `users` table; load on login, clear on logout
- Level-change popup in `exercise.component` — green gradient (💪) for level-up, red (😢) for level-down, auto-dismiss after 2.5s
- Difficulty display in Achievements page (🐭 Maus → 🐉 Drache tier names)
- 12/12 E2E tests in `e2e/mathe-schwierigkeitsstufe.spec.ts`; 557/557 unit tests passing
- DB migration applied to both local and production Supabase (`ahmnwgqforqklfdgdrpg`)

### Deviations from original plan
- Added `clearLastLevelUp()` / `clearLastLevelDown()` consumer pattern to prevent popup re-fire on effect re-runs (not in original spec)
- E2E tests use `page.evaluate` + `ng.getComponent()` to bypass type-toggle lock for test users
- Added `waitForTimeout(1500)` in E2E `beforeEach` to let Supabase init settle

### Date completed
2026-05-09
