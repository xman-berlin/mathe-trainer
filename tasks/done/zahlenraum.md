# Feature: Zahlenraum-Einstellung

## Ziel
Nutzer können für alle Matheübungen den maximalen Zahlenraum frei einstellen.  
Einstellung ist pro User persistent (Supabase + localStorage-Fallback).

## Anforderungen
- Zahnrad-Icon (⚙️) in der Titelleiste der ExerciseComponent (neben "← Zurück")
- Klick öffnet modalen Dialog: Titel "Einstellungen", eine Einstellung: "Zahlenraum"
- Freies Zahlenfeld: muss eine ganze Zahl ≥ 100 sein, Default: 100
- Validierung: Eingabe < 100 → Fehlermeldung unter dem Input, Button deaktiviert
- Dialog schließen: "Speichern"-Button (validiert) + "Abbrechen"-Button + Klick außerhalb
- Persistenz: Supabase `users.math_number_range` + localStorage-Fallback `schlaufuchs-number-range`
- Zahlenraum gilt für Addition, Subtraktion, Multiplikation, Division

## Wie der Zahlenraum die Problemgenerierung beeinflusst

`ProblemGeneratorService` erhält einen optionalen `maxValue`-Parameter.  
Die Level-basierten Generatoren werden nicht geändert — stattdessen wird nach der Generierung geprüft ob `operandA` und `operandB` ≤ `maxValue` sind (Retry-Loop, maximal 50 Versuche, dann Fallback auf Level 1).

Alternativ sauberer: `generateProblem` bekommt `maxValue?: number` und reicht es an die einzelnen Generatoren weiter, die es als Hard-Cap auf ihre Operanden anwenden.

## Implementierungsschritte

- [ ] 1. `User`-Model: `math_number_range?: number` ergänzen
- [ ] 2. `SupabaseService`: `updateUserGoals` um `math_number_range` erweitern
- [ ] 3. `StatsService`: Signal `mathNumberRange = signal(100)`, laden beim Login, speichern
- [ ] 4. `ProblemGeneratorService`: `maxValue`-Parameter in `generateProblem` + alle 4 Generatoren (Cap auf Operanden)
- [ ] 5. `ExerciseComponent`: `showSettings = signal(false)`, `settingsInput = signal('100')`, Methoden `openSettings()`, `saveSettings()`, `closeSettings()`; `generateProblem` übergibt `mathNumberRange()`
- [ ] 6. Template: Zahnrad-Button in Titelleiste + modaler Dialog mit Zahlenfeld + Validierung + Speichern/Abbrechen
- [ ] 7. CSS: Zahnrad-Button-Stil + Modal-Overlay-Stil (analog zum TimeTrial-Results-Modal)
- [ ] 8. Unit-Tests: ProblemGeneratorService `maxValue`, StatsService `mathNumberRange`
- [ ] 9. Lint + Build + Tests

## Betroffene Dateien
- `src/app/models/user.model.ts`
- `src/app/services/supabase.service.ts`
- `src/app/services/stats.service.ts`
- `src/app/services/problem-generator.service.ts`
- `src/app/components/exercise/exercise.component.ts`
- `src/app/components/exercise/exercise.component.html`
- `src/app/components/exercise/exercise.component.scss`

## UI-Skizze

```
[ ← Zurück ]                    [ ⚙️ ]
```

```
┌─────────────────────────────┐
│  Einstellungen           [×] │
│                              │
│  Zahlenraum                  │
│  ┌──────────────────────┐    │
│  │  100                 │    │
│  └──────────────────────┘    │
│  Mindestens 100              │  ← Fehlermeldung (nur bei ungültig)
│                              │
│  [Abbrechen]   [Speichern]   │
└─────────────────────────────┘
```

## Review

**Completed:** 2026-05-11

### What was implemented
- `user.model.ts`: `math_number_range?: number` field added
- `supabase.service.ts`: `updateUserGoals` extended with optional `mathNumberRange` param
- `stats.service.ts`: `mathNumberRange` signal (default 100), `setMathNumberRange()`, localStorage load/save (`schlaufuchs-number-range`), Supabase sync via `syncGoalsToServer`, `clearUserData` reset
- `problem-generator.service.ts`: `generateProblem` accepts `maxValue` — retry loop (50 attempts), fallback to level 1
- `word-problem.service.ts`: `generateProblem` and all four operation generators accept `maxValue`
- `exercise.component.ts/html/scss`: passes `mathNumberRange()` to generator; settings modal moved out to category overview
- `word-problem-exercise.component.ts/html`: removed old `range-selector` buttons; reads `currentMathNumberRange()` from StatsService
- `category-overview.ts/html/scss`: Zahlenraum row with gear icon + modal (open/save/cancel/validate) in the Mathe `goal-section`
- `supabase/migrations/20260511_math_number_range.sql`: `ALTER TABLE users ADD COLUMN math_number_range integer NOT NULL DEFAULT 100`

### Deviations from original plan
- Gear icon moved from `ExerciseComponent` top-bar to the Mathe overview page (`CategoryOverviewComponent`) — more accessible, available before entering any exercise
- `NumberRange` enum (`bis20`/`bis100`) bypassed in `WordProblemService` — numeric `maxValue` applied directly

### Tests added
- 37 unit tests across `stats.service`, `supabase.service`, `problem-generator.service`, `word-problem.service`, `category-overview`, `word-problem-exercise`
- 12 e2e tests in `e2e/mathe-einstellungen.spec.ts` covering display, modal open/close, save/validation, localStorage persistence, and integration into Übung and Sachaufgaben
