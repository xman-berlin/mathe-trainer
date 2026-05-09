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

Division hat nur 4 Stufen: Maus → Fuchs → Wolf → Adler.

Name + Emoji werden in den Erfolgen neben der Stufenzahl angezeigt:
z.B. `Stufe 3 / 6 — 🐺 Wolf`

---

## Difficulty Levels

### Addition & Subtraction (6 levels)

| Stufe | Name | Zahlenraum | Übertrag |
|-------|------|-----------|---------|
| 1 | 🐭 Maus | 1–10 | kein |
| 2 | 🦊 Fuchs | 1–100 | kein |
| 3 | 🐺 Wolf | 1–100 | 10er (Ergebnis bleibt im Zahlenraum) |
| 4 | 🦅 Adler | 1–100 | >10er (Ergebnis bleibt im Zahlenraum) |
| 5 | 🦁 Löwe | 1–1000 | 10er |
| 6 | 🐉 Drache | 1–1000 | >10er |

Default: Stufe 3 (🐺 Wolf)

Constraints:
- Subtraction: result always ≥ 1
- Carries/borrows must stay within the number range of the level

### Multiplikation (6 Stufen)

| Stufe | Name | Faktoren |
|-------|------|---------|
| 1 | 🐭 Maus | 1–5 × 1–5 |
| 2 | 🦊 Fuchs | 1–10 × 1–10 |
| 3 | 🐺 Wolf | 1–10 × 11–20 |
| 4 | 🦅 Adler | 11–20 × 11–20 |
| 5 | 🦁 Löwe | 1–10 × 1–100 |
| 6 | 🐉 Drache | 11–100 × 11–100 |

Default: Stufe 2 (🦊 Fuchs)

### Division (4 Stufen, kein Rest)

| Stufe | Name | Dividenden | Divisor |
|-------|------|-----------|---------|
| 1 | 🐭 Maus | ≤25 | 1–5 |
| 2 | 🦊 Fuchs | ≤100 | 1–10 |
| 3 | 🐺 Wolf | ≤200 | 1–10 |
| 4 | 🦅 Adler | ≤1000 | 1–10 |

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
