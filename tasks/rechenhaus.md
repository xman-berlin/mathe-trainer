# Feature: Rechenhaus-Übung

## Ziel

Neue Übungsart unter `mathe/rechenhaus`: Zahlenzerlegung mit einem visuellen Rechenhaus.
Trainiert Addition und Subtraktion als Beziehung (7 = 3 + ?) statt isolierter Rechnungen.

Rechenhaus-Ergebnisse zählen direkt zu Addition und Subtraktion — in Daily Stats,
Tagesziel, Medaillen, Coins, Badges und Schwierigkeitsadaption. Kein eigener Typ, keine
eigenen Badges, keine Schema-Änderungen.

---

## Was ist ein Rechenhaus?

```
     [ 7 ]       ← Dach  (Gesamtzahl)
    /     \
  [3]     [?]    ← Fenster (Teile)
```

Dach + ein Fenster sind gegeben. Das andere Fenster fehlt.
Zwei Varianten je Aufgabe (zufällig):

- **Rechts fehlt** (`7 = 3 + ?`) → Ergebnis wird als `'subtraction'` gebucht (`7 − 3 = 4`)
- **Links fehlt** (`7 = ? + 4`) → Ergebnis wird als `'subtraction'` gebucht (`7 − 4 = 3`)

Beide Varianten sind konzeptuell Subtraktionen (Ergänzen zum Dach). Damit laufen alle
Rechenhaus-Ergebnisse über `stats.recordResult(isCorrect, 'subtraction')` — genau wie
eine normale Subtraktion im ExerciseComponent.

> **Begründung**: Fehlende Teile ermitteln ist die Kernkompetenz der Subtraktion.
> Addition wäre passend, wenn das Dach gesucht wäre — das ist hier nicht der Fall.

Das Dach fehlt nicht (kein reines Addieren — bewusste Entscheidung).

---

## Konsequenzen der Integration

Da `'subtraction'` gebucht wird, passiert automatisch ohne jede Code-Änderung:

| Was | Wo | Effekt |
|---|---|---|
| Daily Stats | `StatsService.byType['subtraction']` | Tagesstatistik steigt |
| Tagesziel | `mathCorrectCount()` | zählt zu Mathe-Tagesziel |
| Konfetti | `isGoalReached()` | ausgelöst wenn Tagesziel erreicht |
| Coins | `awardCoinForCorrectAnswer()` | 1 Coin pro richtiger Antwort |
| Tagesbonus | `checkDailyGoalBonus()` | 10 Coins bei Zielerreichung |
| Medaillen | `getMedalLevel('subtraction')` | Bronze/Silber/Gold bei 100/500/1000 |
| Badges | `bronze/silver/gold-collector` | zählen zu Subtraktion |
| Schwierigkeit | `DifficultyService.recordResult('subtraction', ...)` | Level-Anpassung |
| Supabase | `syncToServer()` | automatisch, kein Code nötig |

---

## Schwierigkeitsadaption

Das Component liest `difficultyService.getLevel('subtraction')` um den Zahlenbereich
für das Dach zu bestimmen. Dieselbe Level-Tabelle wie bei Subtraktion:

| Level | Dach-Bereich |
|-------|-------------|
| 1     | 2–10        |
| 2     | 2–20 (default) |
| 3     | 2–50        |
| 4     | 2–100       |
| 5     | 2–200       |
| 6     | 2–1000      |

Der Bereich wird außerdem durch `mathNumberRange` gedeckelt.

Level-Up/Down-Events werden auf `'subtraction'` gefiltert und im Banner angezeigt —
genau wie im ExerciseComponent.

---

## Architektur-Überblick

**Keine Änderungen** an Services, Models, Badges oder Stats nötig.

Nur zwei minimale Ergänzungen:
1. `achievements.component.ts` / `.html` — Rechenhaus-Eintrag in der Medaillenliste (optional, s.u.)
2. Neues Component + Route + Action-Card

---

## Schritt 1 — `achievements.component.ts` und `.html`

Rechenhaus erscheint **nicht** als eigene Zeile in der Medaillenliste, weil es keine
eigenen Medaillen hat — es zählt zu Subtraktion. Die bestehende Subtraktion-Karte zeigt
automatisch den kombinierten Fortschritt.

Optional: einen Hinweis „inkl. Rechenhaus" unter der Subtraktion-Medaillen-Karte.
→ **Empfehlung: weglassen** — würde die UI komplizieren ohne Mehrwert für das Kind.

**→ Kein Code nötig.**

---

## Schritt 2 — `category-overview.html`

Neue Action-Card im `@if (category() === 'math')`-Block, nach der Sachaufgaben-Card:

```html
@if (category() === 'math') {
  <a routerLink="/mathe/rechenhaus" class="action-card rechenhaus-card">
    <div class="card-icon">🏠</div>
    <h3>Rechenhaus</h3>
    <p>Übe das Zerlegen von Zahlen</p>
  </a>
}
```

---

## Schritt 3 — `app.routes.ts`

Analog zu anderen Routen, lazy-loaded:

```typescript
{
  path: 'mathe/rechenhaus',
  loadComponent: () =>
    import('./components/rechenhaus-exercise/rechenhaus-exercise').then(
      m => m.RechenHausExerciseComponent
    ),
  canActivate: [authGuard],
},
```

---

## Schritt 4 — Neues Component: `RechenHausExerciseComponent`

### Dateien

```
src/app/components/rechenhaus-exercise/
  rechenhaus-exercise.ts
  rechenhaus-exercise.html
  rechenhaus-exercise.scss
  rechenhaus-exercise.spec.ts
```

### `rechenhaus-exercise.ts` — Logik

```typescript
@Component({
  standalone: true,
  selector: 'app-rechenhaus-exercise',
  imports: [RouterLink, KeypadComponent],
  templateUrl: './rechenhaus-exercise.html',
  styleUrl: './rechenhaus-exercise.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ExerciseStateService],
})
export class RechenHausExerciseComponent {
  // Aufgaben-Signals
  roof    = signal(0);
  left    = signal(0);
  right   = signal(0);
  missing = signal<'left' | 'right'>('right');

  userAnswer        = signal('');
  feedback          = signal<'idle' | 'correct' | 'incorrect'>('idle');
  showCorrectAnswer = signal(false);

  // Streak / Milestone / Confetti — identisch zu ExerciseComponent
  private exerciseState = inject(ExerciseStateService);
  readonly streak         = this.exerciseState.streak;
  readonly bestStreak     = this.exerciseState.bestStreak;
  readonly showMilestone  = this.exerciseState.showMilestone;
  readonly milestoneValue = this.exerciseState.milestoneValue;
  readonly confettiPieces = this.exerciseState.confettiPieces;
  get confettiX()         { return this.exerciseState.confettiX; }

  // Level-Up-Banner — identisch zu ExerciseComponent, aber gefiltert auf 'subtraction'
  readonly showLevelUp = signal(false);
  readonly levelUpInfo = signal<{ emoji: string; name: string; direction: 'up' | 'down' } | null>(null);
  private levelUpTimer: ReturnType<typeof setTimeout> | null = null;

  private stats      = inject(StatsService);
  private difficulty = inject(DifficultyService);
  private generator  = inject(ProblemGeneratorService);  // für randomInt()

  readonly mathNumberRange = computed(() => this.stats.currentMathNumberRange());
  readonly keypadDisabled  = computed(() => this.feedback() !== 'idle');
  readonly correctAnswer   = computed(() =>
    this.missing() === 'right' ? this.right() : this.left()
  );

  constructor() {
    this.exerciseState.setMilestones([5, 10, 20, 30, 40, 50, 75, 100]);
    this.generateProblem();

    // Level-Up/-Down nur für Subtraction anzeigen
    effect(() => {
      const ev = this.difficulty.lastLevelUp();
      if (!ev || ev.type !== 'subtraction') return;
      this.difficulty.clearLastLevelUp();
      const tier = this.difficulty.getTierForLevel(ev.level);
      this._showLevelNotification(tier.emoji, tier.name, 'up');
    });

    effect(() => {
      const ev = this.difficulty.lastLevelDown();
      if (!ev || ev.type !== 'subtraction') return;
      this.difficulty.clearLastLevelDown();
      const tier = this.difficulty.getTierForLevel(ev.level);
      this._showLevelNotification(tier.emoji, tier.name, 'down');
    });
  }

  generateProblem(): void {
    const level    = this.difficulty.getLevel('subtraction');
    const maxRange = this.mathNumberRange();

    // Dach-Maximum aus Level-Tabelle, gedeckelt durch Zahlenraum
    const levelMax  = [0, 10, 20, 50, 100, 200, 1000][level] ?? 100;
    const maxRoof   = Math.min(levelMax, maxRange);
    const minRoof   = Math.max(2, Math.floor(maxRoof * 0.2));

    const roof    = this.generator.randomInt(minRoof, maxRoof);
    const left    = this.generator.randomInt(0, roof);
    const right   = roof - left;
    const missing = Math.random() < 0.5 ? 'left' : 'right';

    this.roof.set(roof);
    this.left.set(left);
    this.right.set(right);
    this.missing.set(missing as 'left' | 'right');
    this.userAnswer.set('');
    this.feedback.set('idle');
    this.showCorrectAnswer.set(false);
  }

  submitAnswer(): void {
    if (this.userAnswer() === '' || this.feedback() !== 'idle') return;

    const parsed    = Number(this.userAnswer());
    const isCorrect = Number.isFinite(parsed)
      && Number.isInteger(parsed)
      && parsed === this.correctAnswer();

    this.feedback.set(isCorrect ? 'correct' : 'incorrect');
    if (!isCorrect) this.showCorrectAnswer.set(true);

    // Zählt zu Subtraktion — wie eine normale Subtraktion im ExerciseComponent
    this.exerciseState.handleResult(isCorrect, () => this.generateProblem());
    this.stats.recordResult(isCorrect, 'subtraction');
    this.difficulty.recordResult('subtraction', isCorrect);
  }

  private _showLevelNotification(emoji: string, name: string, direction: 'up' | 'down'): void {
    if (this.levelUpTimer) clearTimeout(this.levelUpTimer);
    this.levelUpInfo.set({ emoji, name, direction });
    this.showLevelUp.set(true);
    this.levelUpTimer = setTimeout(() => this.showLevelUp.set(false), 2500);
  }

  ngOnDestroy(): void {
    if (this.levelUpTimer) clearTimeout(this.levelUpTimer);
  }
}
```

### `rechenhaus-exercise.html` — Template-Struktur

```
[Zurück-Link: /mathe]

[Streak-Anzeige + Milestone-Popup]           ← copy/adapt aus exercise.component.html
[Level-Up/-Down-Banner]                      ← copy/adapt aus exercise.component.html

[.house]
  [.house-roof]
    .roof-number → roof()

  [.house-body]
    [.window.left]
      @if missing() === 'left'  → .answer-display (userAnswer / Platzhalter)
      @else                     → Zahl: left()

    [.window.right]
      @if missing() === 'right' → .answer-display (userAnswer / Platzhalter)
      @else                     → Zahl: right()

[Feedback: richtig ✓ / falsch ✗ + korrekte Antwort]

[app-keypad]
  [value]="userAnswer"
  (valueChange)="userAnswer.set($event)"
  (keypadSubmit)="submitAnswer()"
  [disabled]="keypadDisabled"
```

### `rechenhaus-exercise.scss` — CSS-Haus (kein SVG)

Das Dach wird mit einem CSS-Dreieck (border-trick) realisiert, sodass die Zahl mittig
sitzt. Zahlen in Dach und Fenstern werden groß und klar dargestellt.

Wesentliche Klassen:
- `.house` — vertikaler Flex-Container
- `.house-roof` — Dreieck via border-trick; enthält `.roof-number` als absolut positioniertes
  Kind
- `.house-body` — horizontaler Flex-Container mit zwei `.window`-Elementen
- `.window.missing` — farblich hervorgehoben (Accent-Farbe), zeigt die Eingabe

Responsive: Haus skaliert mit `vmin`-Einheiten auf kleinen Bildschirmen.

---

## Schritt 5 — Unit-Tests: `rechenhaus-exercise.spec.ts`

Mindestens:
- `generateProblem()` erzeugt gültige Aufgabe: `left + right === roof`
- Korrekte Antwort wird richtig berechnet (beide Varianten: links und rechts fehlt)
- `submitAnswer()` mit richtiger Antwort → feedback `'correct'`, `stats.recordResult` mit
  `'subtraction'` aufgerufen
- `submitAnswer()` mit falscher Antwort → feedback `'incorrect'`, `showCorrectAnswer` true
- Level-Up-Banner erscheint bei `subtraction`-Level-Up, nicht bei anderen Typen

Alle bestehenden Specs müssen weiterhin grün sein (keine neuen Signale in
Root-Services → keine Mock-Lücken).

---

## Schritt 6 — E2E Tests

### `e2e/mathe-rechenhaus.spec.ts` (neu)

```typescript
import { test, expect } from '@playwright/test';
import { bypassLogin, handleMigrationDialog } from './helpers';

test.beforeEach(async ({ page }) => {
  await bypassLogin(page);
  await page.goto('http://localhost:4200/');
  await handleMigrationDialog(page);
});

test('navigiert zu Rechenhaus über Mathe-Übersicht', async ({ page }) => {
  await page.getByRole('link', { name: /Mathe/i }).click();
  await page.getByRole('link', { name: /Rechenhaus/i }).click();
  await expect(page).toHaveURL(/rechenhaus/);
  await expect(page.locator('.house')).toBeVisible();
});

test('zeigt Dach und ein beschriftetes Fenster', async ({ page }) => {
  await page.goto('http://localhost:4200/mathe/rechenhaus');
  await handleMigrationDialog(page);
  await expect(page.locator('.roof-number')).toBeVisible();
  // genau ein Fenster hat eine Zahl, das andere zeigt das Eingabe-Display
  const windows = page.locator('.window');
  await expect(windows).toHaveCount(2);
});

test('richtige Antwort zeigt Erfolgs-Feedback', async ({ page }) => {
  await page.goto('http://localhost:4200/mathe/rechenhaus');
  await handleMigrationDialog(page);
  // lese roof, left, right aus DOM-data-Attributen
  const correct = await page.locator('.house').getAttribute('data-correct');
  for (const digit of correct!) {
    await page.locator(`[data-digit="${digit}"]`).click();
  }
  await page.locator('[data-testid="keypad-submit"]').click();
  await expect(page.locator('.feedback-correct')).toBeVisible();
});
```

> Die exakten Selektoren hängen vom fertigen HTML ab — als data-Attribute umsetzen
> (`data-correct`, `data-digit`, `data-testid`), damit Tests stabil bleiben.

### `e2e/navigation.spec.ts` — Click-through ergänzen

Neuer Test: Startseite → Mathe → Rechenhaus-Link klicken → URL enthält `/rechenhaus`.

---

## Aufgabenliste

### Navigation & Routing
- [ ] `category-overview.html`: Action-Card für Rechenhaus ergänzen
- [ ] `app.routes.ts`: Route `mathe/rechenhaus` eintragen (lazy-load)

### Component
- [ ] `rechenhaus-exercise.ts` erstellen
- [ ] `rechenhaus-exercise.html` erstellen
- [ ] `rechenhaus-exercise.scss` erstellen

### Tests
- [ ] `rechenhaus-exercise.spec.ts` (Unit-Tests)
- [ ] `e2e/mathe-rechenhaus.spec.ts` (neu)
- [ ] `e2e/navigation.spec.ts` um Click-through ergänzen
- [ ] Vollständige Test-Suite grün: `npm run lint && npm run build && npm run test -- --watch=false && npm run e2e`

---

## Entscheidungen — kein Klärungsbedarf mehr

| Frage | Entscheidung |
|---|---|
| Eigener Stats-Typ? | Nein — zählt zu `'subtraction'` |
| Eigene Badges? | Nein — Subtraktion-Badges profitieren automatisch |
| Eigene Medaillen-Karte in Erfolge? | Nein — Subtraktion-Karte zeigt kombinierten Fortschritt |
| Eigener DifficultyOperationType? | Nein — liest `subtraction`-Level |
| Bronze-Sperre? | Nicht anwendbar — eigenes Component |
| Sammler-Badges ändern? | Nein — unverändert |

---

## Review

*(wird nach Fertigstellung ausgefüllt)*
