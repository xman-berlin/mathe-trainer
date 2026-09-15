# Übungsplan konfigurieren

Parents (and kids) freely assemble the guided plan behind „Übung starten“: **which exercises**, **in which order**, and **how many correct answers** per step.

## Example (desired outcome)

| # | Step | Target |
|---|---|---|
| 1 | Mathe / Sachaufgaben | 10 |
| 2 | Uhrzeit / Zeitpunkte & Zeitspannen | 10 |
| 3 | Englisch / Übersetzung | 20 |

Not limited to today’s fixed Mathe→Deutsch→Sequences→Uhrzeit chain, and not forced to reuse Tagesziele as block sizes.

## Status quo

[`PracticePlanService.startFromDailyGoals()`](../src/app/services/practice-plan.service.ts) hard-codes six category-level blocks; targets come from Tagesziele (sequences fixed at 5). Englisch / Sachaufgaben / Zeiger setzen / Zeitpunkte / Hangman are out. No config UI.

## Product decisions

| Topic | Decision |
|---|---|
| Config granularity | **Concrete exercise**, not only category (e.g. Sachaufgaben ≠ Mathe-Übung) |
| Freely set | Order, inclusion, **target count per step** (1–100) |
| Steps | Ordered list; duplicates of the same exercise **allowed** (e.g. Mathe 10 twice) |
| Min / max steps | At least **1** step; soft max **20** |
| Tagesziele | Remain for free practice / home cards; plan targets are **independent** (snapshot at start still) |
| Default plan | Sensible starter: Mathe-Übung (math goal), Deutsch Rechtschreibung (deutsch goal), Englisch Übersetzung (englisch goal), Uhrzeit-Übung (clock goal) — sequences optional off by default or included with target 5 |
| Config UI | Modal „Plan einrichten“ from home (beside „Übung starten“) |
| While plan active | Config disabled until cancel |
| **Per user** | **Each child has an independent plan** — Tom’s steps ≠ Ada’s. Switching user loads that user’s config. |
| Persistence | `users.practice_plan_config` (jsonb) as source of truth + localStorage cache keyed by `userId` |

## Exercise catalog (dynamic)

**Rule:** Possible plan steps = **all practice tiles under the four home categories**. The catalog is **not** a second hard-coded list in the plan service.

### Single source of truth

Introduce a shared registry, e.g. [`src/app/models/category-exercise.catalog.ts`](../src/app/models/category-exercise.catalog.ts) (name flexible):

```ts
export interface CategoryExerciseTile {
  id: string;                 // stable id for plan config + recordCorrect
  category: 'math' | 'clock' | 'deutsch' | 'englisch';
  categoryLabel: string;      // Mathe | Uhrzeit | Deutsch | Englisch
  title: string;              // tile h3: Übung, Sachaufgaben, …
  description?: string;
  route: string;
  icon?: string;
  /** Show only on this category overview (math vs clock share one component today) */
  overviewFor: 'math' | 'clock' | 'deutsch' | 'englisch';
}
```

`PRACTICE_EXERCISE_CATALOG: CategoryExerciseTile[]` lists every action card currently under Mathe / Uhrzeit / Deutsch / Englisch (Verwalten / Erfolge excluded).

### Consumers (same array)

| Consumer | Behavior |
|---|---|
| Category overviews | `@for (tile of tilesForCategory())` instead of hard-coded HTML links |
| Plan config modal | Picker grouped by `categoryLabel` from **full catalog** (`catalog.length` = current tile count) |
| `PracticePlanService` | Resolve `exerciseId` → route/label; drop unknown ids on load |

Adding a new exercise tile = **one catalog entry** → appears on the overview and in the plan picker automatically. No separate plan catalog to update.

### Current seed (illustrative — live data = array contents)

Same tiles as today under the categories: Mathe (Übung, Zeitrennen, Sachaufgaben), Uhrzeit (Übung, Zeitrennen, Zeiger setzen, Zeitpunkte & Zeitspannen), Deutsch (Rechtschreibung, Wörter Raten, Wochentage, Monate, Alphabet), Englisch (Übersetzung).

Plan step label: `` `${categoryLabel} / ${title}` `` (e.g. `Mathe / Sachaufgaben`).

### Validation

- Saved config may reference removed ids → skip those steps on load  
- If after filter zero steps remain → fall back to default plan built from catalog (e.g. first practice tile per category, or a small default id list that is filtered against catalog)

## Data model

```ts
interface PracticePlanStepConfig {
  /** Catalog id, e.g. 'math-sachaufgaben' */
  exerciseId: string;
  /** Correct answers required for this step */
  target: number; // clamped 1–100
}

interface PracticePlanConfig {
  steps: PracticePlanStepConfig[];
}
```

Runtime block (session snapshot):

```ts
interface PracticePlanBlock {
  id: string;          // same as exerciseId (or unique instance id if duplicates)
  exerciseId: string;
  label: string;
  route: string;
  target: number;
  progress: number;
}
```

`recordCorrect(exerciseId)` matches the **current** step’s `exerciseId` (if duplicates, only the active step advances).

## Config UI (German)

Modal „Plan einrichten“:

1. **Step list** (ordered): label, target input, ↑ ↓, remove  
2. **Add step**: picker from catalog (grouped by Mathe / Uhrzeit / Deutsch / Englisch)  
3. Preview line matching the example style: `1. Mathe / Sachaufgaben · 10`  
4. Speichern / Abbrechen  
5. Optional „Standard wiederherstellen“

Home hint under CTA reflects saved steps (short summary).

## Behavior during guided plan

- Navigate to step `route`; count only correct answers via `recordCorrect(exerciseId)`.
- **Type selectors** on Mathe-Übung / Uhrzeit-Übungen: stay **locked to full mix** while guiding (same as today for math/clock), so the plan stays “do this exercise kind”, not “pick easy subtypes”. Sachaufgaben / sequence / Englisch have no subtype lock needed.
- Back while guiding → home + pause; „Weiterüben“ resumes current step.
- Advance when `progress >= target`; after last step → home + complete.

## Wiring gaps (must fix in implementation)

Exercises that need `practicePlan.recordCorrect(...)` (and guiding back/pause where missing):

- Mathe Zeitrennen, Sachaufgaben
- Uhrzeit Zeitrennen, Zeiger setzen, Zeitpunkte & Zeitspannen
- Deutsch Hangman
- Englisch Übersetzung

(Already wired today: Mathe-Übung, Deutsch Rechtschreibung, Wochentage/Monate/Alphabet, Uhrzeit-Übung.)

Timed challenges (Zeitrennen): define clear rule — count **one correct answer per solved item** toward the step target (same as free practice scoring), or count completed race as 1. **Decision:** one plan progress per correct answer during the race (consistent with other blocks).

Extend type-lock while guiding for Mathe/Uhrzeit practice tiles that expose type selectors (Übung, Zeiger, Zeitpunkte).

## Persistence (per user)

- **DB:** `users.practice_plan_config jsonb` — one config document **per user row**
- **Cache:** `localStorage` key e.g. `schlaufuchs-practice-plan-config:${userId}` (never a global key without user id)
- **Lifecycle:**
  - Login / `loadUserData`: load this user’s config from server (fallback cache → default)
  - Speichern in modal: write cache + `updateUserPracticePlanConfig(userId, config)`
  - Logout: clear in-memory plan session **and** do not leak previous user’s steps into the next login
- **Active session** stays in-memory and is tied to the current user; on user switch, cancel any running plan
- Validate on load against current catalog; unknown ids dropped; empty → default for that user

Shared catalog of *possible* tiles is global; **which steps / order / targets** are always user-specific.

## Out of v1

- Configuring subtypes inside a tile (e.g. only Addition)
- Admin tiles (Verwalten) or Erfolge as plan steps
- Adaptive step insertion
- Persisting mid-session progress across reload
- Drag-and-drop (↑↓ sufficient)
- Named presets beyond one saved config + reset default

## Implementation checklist

- [ ] Update this plan + keep `tasks/todo.md` row
- [ ] Add shared `PRACTICE_EXERCISE_CATALOG` (+ helpers `tilesFor(overview)`)
- [ ] Refactor Mathe/Uhrzeit/Deutsch/Englisch overviews to render tiles from catalog
- [ ] SQL: `users.practice_plan_config`
- [ ] Config load/save/validate against **current** catalog in `PracticePlanService`
- [ ] `startFromConfig()` builds free steps from catalog metadata
- [ ] Wire `recordCorrect` in all catalog exercises not yet hooked
- [ ] Type-lock for relevant tiles while guiding
- [ ] Home modal: add / remove / reorder / set targets (picker = dynamic catalog)
- [ ] Unit tests: catalog-driven build, unknown id dropped, clamps, duplicates
- [ ] E2E: configure example plan, start, assert first URL
- [ ] Browser-test + full suite

## Related

- [`tasks/done/uebungsplan.md`](done/uebungsplan.md) — v1 fixed plan (superseded for config)
- [`tasks/done/englisch-vokabeltrainer.md`](done/englisch-vokabeltrainer.md)
