# Plan: Test Coverage — Unit & E2E

## Status: ✅ done

## Current Coverage (2026-04-02)
- **Tests**: 219 total (Unit) + ~30 E2E

## Context

Aktuell gibt es nur 2 Test-Dateien (`app.spec.ts`, `badge.service.spec.ts`) für 29 Source-Dateien (~7% Coverage). Kein E2E-Setup vorhanden. Mehr Tests sind nötig bevor weitere Refactorings sicher durchgeführt werden können.

## Unit Tests

### Phase 1: Pure Services (keine Angular Dependencies) ✅
Schnell zu testen, hoher Wert.

| # | Service | Fokus | Tests | Status |
|---|---|---|---|---|
| 1 | `ProblemGeneratorService` | generateAddition/Subtraction/Multiplication/Division, Problem-Struktur, allowedNumbers | 22 | ✅ done |
| 2 | `ExerciseStateService` | handleResult (streak, milestone, reset), setMilestones | 18 | ✅ done |

### Phase 2: Services mit Dependencies (Mock-basiert)
Benötigen `provideZonelessChangeDetection()` + Mock Services.

| # | Service | Fokus | Tests |
|---|---|---|---|
| 3 | `DailyStreakService` | currentStreak/longestStreak computed, checkAndUpdateStreak, getNextMilestone | ~12 |
| 4 | `CoinsService` | balance computed, canAfford, awardCoins, spendCoins, transaction queue | ~10 |
| 5 | `AuthService` | login/logout, isAuthenticated, currentUser signal | ~8 |
| 6 | `StatsService` | recordAnswer, statsByType, dailyGoal, streak tracking | ~12 |

### Phase 3: Komponenten (integration)
Benötigen TestBed + Mock Services.

| # | Komponente | Fokus | Tests |
|---|---|---|---|
| 7 | `CategoryHomeComponent` | computed stats, goal editor | ~6 |
| 8 | `StreakDisplayComponent` | progress, milestones | ~5 |
| 9 | `UserProfileComponent` | switchUser, avatar URL | ~3 |

## E2E Tests

### Setup: Playwright
- `npm init playwright@latest` (neues Angular 20 Projekt)
- Config: `playwright.config.ts` mit baseURL `http://localhost:4200`
- Test-Verzeichnis: `e2e/`

### Allgemeine Pfade

| # | Test | Fokus | Tests |
|---|---|---|---|
| 1 | Login → Home | Login-Flow, Redirect, User-Display | ~3 |
| 2 | Navigation | Alle Routes erreichbar, Guards funktionieren | ~4 |
| 3 | Achievements | Badges laden, Tab-Wechsel (Mathe/Uhrzeit/Badges/Spiele) | ~3 |

### Kategorie: Mathe

| # | Route | Übungsart | Tests |
|---|---|---|---|
| 4 | `/mathe/uebung` | Addition (select type, answer, feedback, streak) | ~2 |
| 5 | `/mathe/uebung` | Subtraktion | ~2 |
| 6 | `/mathe/uebung` | Multiplikation (mit number filter) | ~2 |
| 7 | `/mathe/uebung` | Division | ~2 |
| 8 | `/mathe/zeitrennen` | TimeTrial Modus (Timer, Score, Personal Best) | ~3 |
| 9 | `/mathe/sachaufgaben` | Sachaufgaben (lesen, antworten, feedback) | ~2 |

### Kategorie: Uhrzeit

| # | Route | Übungsart | Tests |
|---|---|---|---|
| 10 | `/uhrzeit/uebung` | Volle Stunde (clock display, antwort, feedback) | ~2 |
| 11 | `/uhrzeit/uebung` | Halbe Stunde | ~2 |
| 12 | `/uhrzeit/uebung` | Viertelstunde | ~2 |
| 13 | `/uhrzeit/uebung` | Fünf Minuten | ~2 |
| 14 | `/uhrzeit/zeitrennen` | Uhrzeit TimeTrial | ~2 |
| 15 | `/uhrzeit/zeiger-setzen` | Zeiger setzen (interactive clock, drag) | ~2 |

### Kategorie: Deutsch

| # | Route | Übungsart | Tests |
|---|---|---|---|
| 16 | `/deutsch/rechtschreibung` | Rechtschreibung (word anhören, buchstaben tippen, feedback) | ~3 |
| 17 | `/deutsch/verwalten` | Vokabelverwaltung (liste laden, bearbeiten) | ~2 |

## Implementation Order

1. **Phase 1** (Pure Services): `ProblemGeneratorService`, `ExerciseStateService`
2. **E2E Setup**: Playwright installieren, Login Smoke-Test
3. **E2E Mathe**: Übung (4 Übungsarten), Zeitrennen, Sachaufgaben
4. **E2E Uhrzeit**: Übung (4 Übungsarten), Zeitrennen, Zeiger setzen
5. **E2E Deutsch**: Rechtschreibung, Verwaltung
6. **Phase 2** (Mock Services): `DailyStreakService`, `CoinsService`
7. **Phase 2** (Mock Services): `AuthService`, `StatsService`
8. **Phase 3** (Komponenten): `CategoryHomeComponent`, `StreakDisplayComponent`

## Test Patterns (laut AGENTS.md)

```typescript
// Unit Test Pattern (pure service)
describe('ProblemGeneratorService', () => {
  let service: ProblemGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ProblemGeneratorService],
    });
    service = TestBed.inject(ProblemGeneratorService);
  });

  it('should generate valid addition problem', () => {
    const problem = service.generateAddition();
    expect(problem.answer).toBe(problem.operandA + problem.operandB);
  });
});

// Unit Test Pattern (service with dependencies)
describe('CoinsService', () => {
  let service: CoinsService;
  let mockSupabase: jasmine.SpyObj<SupabaseService>;

  beforeEach(() => {
    mockSupabase = jasmine.createSpyObj('SupabaseService', [
      'getCoinBalance', 'upsertCoinBalance', 'recordCoinTransaction'
    ]);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        CoinsService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });
    service = TestBed.inject(CoinsService);
  });
});

// E2E Test Pattern (Playwright)
import { test, expect } from '@playwright/test';

test('login and navigate to home', async ({ page }) => {
  await page.goto('/login');
  // ... test flow
});
```

## Mock Strategy

- **SupabaseService**: `jasmine.createSpyObj` mit allen relevanten Methoden
- **localStorage**: `spyOn(localStorage, 'getItem')` / `setItem`
- **Router**: `provideRouter([])` in TestBed

## Definition of Done

- [x] Phase 1: ProblemGeneratorService + ExerciseStateService getestet (~25 Tests)
- [x] E2E: Playwright installiert, Login Smoke-Test
- [x] E2E Mathe: 4 Übungsarten + Zeitrennen + Sachaufgaben (~13 Tests)
- [x] E2E Uhrzeit: 4 Übungsarten + Zeitrennen + Zeiger setzen (~12 Tests)
- [x] E2E Deutsch: Rechtschreibung + Verwaltung (~5 Tests)
- [x] Phase 2: DailyStreakService + CoinsService getestet (~22 Tests)
- [x] Phase 2: AuthService + StatsService getestet (~20 Tests)
- [x] Phase 3: 3 Komponenten getestet (~14 Tests)
- [x] `npm run lint` pass
- [x] `npm run build` pass
- [x] `npm run test -- --watch=false` alle grün
- [x] `npx playwright test` alle grün

## Review

**Completed**: 2026-04-02

**What was implemented:**
- Phase 1: ProblemGeneratorService (22 tests) + ExerciseStateService (18 tests) unit tests
- Phase 2: DailyStreakService, CoinsService, AuthService, StatsService — all already had comprehensive tests
- Phase 3: Created 3 new component spec files — CategoryHomeComponent (7), StreakDisplayComponent (6), UserProfileComponent (4)
- E2E: Playwright setup + 11 spec files across Login, Mathe (3), Uhrzeit (3), Deutsch (2)
- Final: 219 unit tests + ~30 E2E tests, all passing

**Deviations:**
- Phase 2 services already had spec files from a previous session — no additions needed
- CategoryHome component uses simplified naming (`category-home.ts` not `category-home.component.ts`)
- StreakDisplayComponent is at `components/streak-display/` not `components/shared/streak-display/`
