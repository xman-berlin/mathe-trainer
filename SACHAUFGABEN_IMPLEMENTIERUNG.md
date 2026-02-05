# Implementierungsplan: Sachaufgaben (Word Problems)

## Überblick
Neue Unterkategorie "Sachaufgaben" im Mathe-Bereich mit dynamisch generierten Textaufgaben für die 2. Klasse Grundschule.

## Anforderungen
- **4 Rechenarten**: Addition, Subtraktion, Multiplikation, Division (mit Zehnerübergang/-unterschreitung)
- **2 Zahlenbereiche**: "Bis 20" und "Bis 100" (umschaltbar)
- **5-10 Story-Templates**: Verschiedene Kontexte (Äpfel, Murmeln, Bücher, etc.)
- **KEIN Zeitrennen-Modus** (nur Übungsmodus)
- **KEINE Zifferauswahl** für Multiplikation/Division
- **Eigene Medaille**: Basierend auf Anzahl gelöster Sachaufgaben

## Architektur-Entscheidung

**Separate Standalone Component** (`WordProblemExerciseComponent`)

**Begründung**:
- Unterschiedliche UI-Anforderungen (mehrzeilige Story-Anzeige vs. einfache Operanden)
- Folgt bestehendem Muster (ClockExerciseComponent ist auch separat)
- Code-Wiederverwendung: KeypadComponent, StatsService, Streak-Logik

## Dateistruktur

### Neu zu erstellende Dateien

```
src/app/
├── components/
│   └── word-problem-exercise/
│       ├── word-problem-exercise.component.ts
│       ├── word-problem-exercise.component.html
│       └── word-problem-exercise.component.css
├── services/
│   └── word-problem.service.ts
└── models/
    └── word-problem.model.ts
```

### Zu modifizierende Dateien

1. `src/app/app.routes.ts` - Route hinzufügen
2. `src/app/services/stats.service.ts` - 'word-problems' zu mathTypes hinzufügen (Zeile 44)
3. `src/app/components/category-overview/category-overview.html` - Action Card für Sachaufgaben (zwischen Zeitrennen und Erfolge)
4. `src/app/components/achievements/achievements.component.ts` - Word-problems zu exerciseTypes
5. `src/app/components/achievements/achievements.component.html` - Medaillen-Anzeige

## Story-Template Design

### Datenmodell (`word-problem.model.ts`)

```typescript
export type WordProblemType = 'addition' | 'subtraction' | 'multiplication' | 'division';
export type NumberRange = 'bis20' | 'bis100';

export interface StoryTemplate {
  id: string;
  context: string;
  templates: {
    addition?: string;
    subtraction?: string;
    multiplication?: string;
    division?: string;
  };
  icon: string;
}

export interface WordProblem {
  type: WordProblemType;
  storyText: string;
  operandA: number;
  operandB: number;
  correctAnswer: number;
  templateId: string;
  numberRange: NumberRange;
}
```

### Story-Templates (8 Stück)

**Beispiele mit Platzhaltern `{a}` und `{b}`**:

1. **Äpfel** 🍎
   - Addition: "Lisa hat {a} Äpfel. Sie bekommt {b} Äpfel geschenkt. Wie viele hat sie jetzt?"
   - Subtraktion: "Tim hat {a} Äpfel. Er isst {b} Äpfel. Wie viele hat er noch?"
   - Multiplikation: "Es gibt {a} Körbe mit je {b} Äpfeln. Wie viele Äpfel insgesamt?"
   - Division: "{a} Äpfel werden auf {b} Kinder verteilt. Wie viele bekommt jedes Kind?"

2. **Murmeln** ⚫
3. **Bücher** 📚
4. **Sticker** ⭐
5. **Kekse** 🍪
6. **Spielzeugautos** 🚗
7. **Blumen** 🌸
8. **Bonbons** 🍬

## Zahlen-Generierungslogik

### Addition
**Bis 20**: Zehnerübergang bei 10
- Beispiel: 7 + 5 = 12
- Logik: `b ∈ [1,10]`, `ones ∈ [11-b, 9]`, `a = ones`
- Ergebnis: 11-19

**Bis 100**: Zehnerübergang an beliebiger Zehnergrenze
- Beispiel: 47 + 8 = 55
- Logik: Wie oben, plus `tens ∈ [1, floor((100-b)/10)]`, `a = tens*10 + ones`

### Subtraktion
**Bis 20**: Zehnerunterschreitung bei 10
- Beispiel: 13 - 5 = 8
- Logik: `b ∈ [1,10]`, `ones ∈ [0, b-1]`, `a = 10 + ones`
- Ergebnis: 10-19

**Bis 100**: Zehnerunterschreitung
- Beispiel: 52 - 7 = 45
- Logik: Wie oben, plus `tens ∈ [1,9]`, `a = tens*10 + ones`

### Multiplikation
**Bis 20**: Kleine Faktoren, Ergebnis ≤ 20
- Beispiel: 4 × 5 = 20
- Logik: `a ∈ [2,5]`, `b ∈ [2, floor(20/a)]`

**Bis 100**: Ergebnis ≤ 100
- Beispiel: 7 × 12 = 84
- Logik: `a ∈ [2,10]`, `b ∈ [2, floor(100/a)]`

### Division
**Bis 20**: Glatte Division, Ergebnis ≤ 20
- Beispiel: 20 ÷ 4 = 5
- Logik: `b ∈ [2,5]`, `quotient ∈ [2, floor(20/b)]`, `a = b × quotient`

**Bis 100**: Glatte Division, Ergebnis ≤ 100
- Logik: `b ∈ [2,10]`, `quotient ∈ [2, floor(100/b)]`, `a = b × quotient`

## UI-Komponenten

### Navigation
Route: `/mathe/sachaufgaben`

Action Card in `/mathe` (zwischen Zeitrennen und Erfolge):
```html
<a routerLink="/mathe/sachaufgaben" class="action-card word-problem-card">
  <div class="card-icon">📝</div>
  <h3>Sachaufgaben</h3>
  <p>Löse Textaufgaben mit Geschichten</p>
</a>
```

### Component-Layout

**Elemente**:
1. **Zurück-Button** (links oben) → `/mathe`
2. **Rechenart-Auswahl** (4 Buttons: +, −, ×, ÷)
3. **Zahlenbereich-Toggle** (Bis 20 / Bis 100)
4. **Story-Anzeige** (Icon + mehrzeiliger Text)
5. **Eingabefeld** + Numpad (KeypadComponent, mode='numeric')
6. **Feedback-Bereich** (richtig/falsch mit korrekter Antwort)
7. **Streak-Anzeige** (aktuell + best)
8. **Tagesstatistik-Badge** (unten)
9. **Meilenstein-Popup** (bei 5, 10, 20, 30, 40, 50, 75, 100 Streak)

**WICHTIG**: KEIN Zeitrennen-Modus, KEIN Zahlenauswahl-Widget

## Implementierungsschritte

### Phase 1: Modelle & Service

**1.1 Models erstellen** (`word-problem.model.ts`)
- Interfaces: `StoryTemplate`, `WordProblem`, `WordProblemType`, `NumberRange`

**1.2 WordProblemService erstellen** (`word-problem.service.ts`)
- 8 Story-Templates als Konstante
- `generateProblem(type: WordProblemType, range: NumberRange): WordProblem`
  - Zufällige Template-Auswahl
  - Zahlen-Generierung nach obiger Logik
  - Platzhalter-Ersetzung (`{a}`, `{b}`)
  - Anti-Wiederholung (letzte 10 Aufgaben speichern)
- `calculateAnswer(type, a, b): number`

### Phase 2: Component

**2.1 Component-Datei** (`word-problem-exercise.component.ts`)

**Signals** (von ExerciseComponent übernehmen):
```typescript
currentProblem = signal<WordProblem | null>(null);
userAnswer = signal('');
feedback = signal<'idle' | 'correct' | 'incorrect'>('idle');
showCorrectAnswer = signal(false);
streak = signal(0);
bestStreak = signal(0);
showMilestone = signal(false);
milestoneValue = signal(0);
selectedTypes = signal<Set<WordProblemType>>(new Set(['addition', 'subtraction', 'multiplication', 'division']));
currentType = signal<WordProblemType>('addition');
numberRange = signal<NumberRange>('bis20'); // Default: bis 20
```

**Computed Signals**:
```typescript
storyText = computed(() => this.currentProblem()?.storyText ?? '');
storyIcon = computed(() => /* Template-Icon basierend auf templateId */);
correctAnswer = computed(() => this.currentProblem()?.correctAnswer ?? 0);
keypadDisabled = computed(() => this.feedback() !== 'idle');
```

**Methoden** (Pattern von ExerciseComponent):
- `constructor()`: Inject WordProblemService, StatsService, AchievementsService
- `ngOnInit()`: Zahlenbereich aus localStorage laden
- `generateProblem()`: Service aufrufen, Problem in Signal speichern, userAnswer reset
- `submitAnswer()`:
  - Validierung
  - Korrektheit prüfen
  - Streak aktualisieren
  - Stats aufzeichnen: `this.stats.recordResult(isCorrect, 'word-problems')`
  - Feedback anzeigen (600ms richtig, 1200ms falsch)
  - Auto-Advance
- `toggleType(type: WordProblemType)`: Typ an/aus, Problem neu generieren
- `setNumberRange(range: NumberRange)`: Range setzen, localStorage speichern, neu generieren
- Meilenstein-Logik (von ExerciseComponent kopieren)

**2.2 Template** (`word-problem-exercise.component.html`)

**Struktur** (angelehnt an exercise.component.html):
```html
<div class="word-problem-container">
  <a routerLink="/mathe" class="back-btn">← Zurück</a>

  <!-- Rechenart-Auswahl -->
  <div class="type-selector">
    @for (type of ['addition', 'subtraction', 'multiplication', 'division']; track type) {
      <button
        [class.active]="selectedTypes().has(type)"
        (click)="toggleType(type)">
        {{ operatorSymbol(type) }}
      </button>
    }
  </div>

  <!-- Zahlenbereich-Toggle -->
  <div class="range-selector">
    <button
      [class.active]="numberRange() === 'bis20'"
      (click)="setNumberRange('bis20')">Bis 20</button>
    <button
      [class.active]="numberRange() === 'bis100'"
      (click)="setNumberRange('bis100')">Bis 100</button>
  </div>

  <!-- Story-Anzeige -->
  <div class="story-display">
    <div class="story-icon">{{ storyIcon() }}</div>
    <div class="story-text">{{ storyText() }}</div>
  </div>

  <!-- Eingabe -->
  <div class="input-section">
    <input readonly [value]="userAnswer()" placeholder="?" class="answer-input" />
  </div>

  <!-- Keypad -->
  <app-keypad
    [value]="userAnswer"
    [maxLength]="3"
    [mode]="'numeric'"
    (valueChange)="userAnswer.set($event)"
    (keypadSubmit)="submitAnswer()"
  />

  <!-- Feedback -->
  <div class="feedback-area">
    @if (feedback() === 'correct') {
      <div class="feedback-correct">✓ Richtig!</div>
    }
    @if (feedback() === 'incorrect' && showCorrectAnswer()) {
      <div class="feedback-incorrect">
        ✗ Die richtige Antwort ist: {{ correctAnswer() }}
      </div>
    }
  </div>

  <!-- Streak -->
  <div class="streak-display">
    <div>Serie: {{ streak() }}</div>
    <div>Beste: {{ bestStreak() }}</div>
  </div>

  <!-- Statistik -->
  <div class="stats-badge-container">
    <app-stats-badge
      [correctCount]="wordProblemCorrectCount()"
      [incorrectCount]="wordProblemIncorrectCount()"
      [showTotal]="true" />
  </div>

  <!-- Meilenstein-Popup -->
  @if (showMilestone()) {
    <div class="milestone-popup">
      <div class="milestone-content">
        <div class="milestone-icon">🎉</div>
        <div class="milestone-text">{{ milestoneValue() }} in Folge!</div>
      </div>
      @for (piece of confettiPieces; track piece) {
        <div class="confetti" [style.left.%]="confettiX[piece]"></div>
      }
    </div>
  }
</div>
```

**2.3 Styles** (`word-problem-exercise.component.css`)

**Basis-CSS** von exercise.component.css kopieren, Anpassungen:
- `.story-display`: Zentriert, größere Schrift (1.25rem), max 600px Breite
- `.story-icon`: Große Emoji-Anzeige (3rem font-size)
- `.story-text`: Mehrzeilig, line-height 1.6
- `.range-selector`: Button-Gruppe mit Active-State
- `.word-problem-card`: Violett/Lila Theme (#8B5CF6)

**Tablet Landscape** (768-1024px + orientation: landscape):
```css
@media (min-width: 768px) and (max-width: 1024px) and (orientation: landscape) {
  .word-problem-container {
    max-width: 1000px;
    display: grid;
    grid-template-columns: 400px 1fr;
    grid-template-rows: auto auto auto 1fr auto;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .story-display {
    grid-column: 1;
    grid-row: 1 / 5;
  }

  .type-selector { grid-column: 2; grid-row: 1; }
  .range-selector { grid-column: 2; grid-row: 2; }
  .input-section { grid-column: 2; grid-row: 3; }
  .keypad { grid-column: 2; grid-row: 4; }
  .streak-display { grid-column: 1; grid-row: 5; }
}
```

### Phase 3: Navigation & Routing

**3.1 Route hinzufügen** (`app.routes.ts`)

Nach Zeile 21 einfügen:
```typescript
{
  path: 'mathe/sachaufgaben',
  component: WordProblemExerciseComponent,
  data: { mode: 'practice' },
  canActivate: [authGuard]
},
```

Import hinzufügen (Zeile 7):
```typescript
import { WordProblemExerciseComponent } from './components/word-problem-exercise/word-problem-exercise.component';
```

**3.2 Action Card** (`category-overview.html`)

Nach Zeile 62 (zwischen "Zeitrennen" und "Erfolge") einfügen:
```html
@if (category() === 'math') {
  <a routerLink="/mathe/sachaufgaben" class="action-card word-problem-card">
    <div class="card-icon">📝</div>
    <h3>Sachaufgaben</h3>
    <p>Löse Textaufgaben mit Geschichten</p>
  </a>
}
```

**3.3 Card-Styling** (`category-overview.css`)

Am Ende der Datei hinzufügen:
```css
.word-problem-card {
  background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
}

.word-problem-card:hover {
  background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
}
```

### Phase 4: Stats & Achievements

**4.1 StatsService** (`stats.service.ts`)

Zeile 44 ändern:
```typescript
private readonly mathTypes = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'word-problems'  // NEU
];
```

**4.2 Achievements Component** (`achievements.component.ts`)

`exerciseTypes` Array erweitern (ca. Zeile 30):
```typescript
{ key: 'word-problems', label: 'Sachaufgaben', icon: '📝' }
```

**4.3 Achievements Template** (`achievements.component.html`)

Medaillen-Section für word-problems hinzufügen (nach bestehenden Sections):
```html
@if (lifetimeStats['word-problems'] !== undefined) {
  <div class="exercise-section">
    <h3>📝 Sachaufgaben</h3>
    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-label">Richtig</div>
        <div class="stat-value">{{ lifetimeStats['word-problems'] ?? 0 }}</div>
      </div>
      <div class="medal-display">
        <div class="medal" [class.earned]="(lifetimeStats['word-problems'] ?? 0) >= 100">
          🥉 Bronze (100)
        </div>
        <div class="medal" [class.earned]="(lifetimeStats['word-problems'] ?? 0) >= 500">
          🥈 Silber (500)
        </div>
        <div class="medal" [class.earned]="(lifetimeStats['word-problems'] ?? 0) >= 1000">
          🥇 Gold (1000)
        </div>
      </div>
    </div>
  </div>
}
```

### Phase 5: Testing & Polish

**5.1 Funktionalität testen**
- Alle 4 Rechenarten mit beiden Zahlenbereichen
- Zehnerübergang/-unterschreitung verifizieren
- Streak-Funktionalität (Meilensteine bei 5, 10, 20, ...)
- Stats-Persistierung (localStorage + Server)
- Medaillen-Progression (100/500/1000)

**5.2 Responsive Design testen**
- Mobile (< 768px)
- Tablet Portrait (768-1024px)
- Tablet Landscape (768-1024px landscape) - Grid-Layout
- Desktop (> 1024px)

**5.3 Textprüfung**
- Alle 8 Templates auf korrekte deutsche Grammatik
- Icon-Darstellung auf verschiedenen Geräten

## Kritische Dateien (Referenz)

**Zu lesen als Muster**:
- `/Users/xman/projects/test/mathe-trainer/src/app/components/exercise/exercise.component.ts:0-100` - Signal-Struktur, Streak-Logik
- `/Users/xman/projects/test/mathe-trainer/src/app/services/clock.ts` - Service-Pattern für Problem-Generierung
- `/Users/xman/projects/test/mathe-trainer/src/app/components/clock-exercise/clock-exercise.css` - Tablet Landscape Grid-Layout

**Zu modifizieren**:
- `/Users/xman/projects/test/mathe-trainer/src/app/app.routes.ts:21` - Route einfügen
- `/Users/xman/projects/test/mathe-trainer/src/app/services/stats.service.ts:44` - Array erweitern
- `/Users/xman/projects/test/mathe-trainer/src/app/components/category-overview/category-overview.html:62` - Card hinzufügen
- `/Users/xman/projects/test/mathe-trainer/src/app/components/achievements/achievements.component.ts` - exerciseTypes erweitern
- `/Users/xman/projects/test/mathe-trainer/src/app/components/achievements/achievements.component.html` - Medal section

## Verifizierung

Nach Implementierung:

1. **Manueller Test**:
   - App starten: `npm run start:poll`
   - Navigieren zu `/mathe` → Sachaufgaben-Card sichtbar zwischen Zeitrennen und Erfolge?
   - Aufgabe lösen → Stats in `/mathe/erfolge` korrekt?

2. **Build-Test**:
   - `npm run build` → erfolgreich?
   - `npm run lint` → keine Fehler?

3. **Funktionstest**:
   - Zahlenbereich wechseln → neue Aufgaben im korrekten Bereich?
   - 5 richtig → Meilenstein-Popup erscheint?
   - Browser-Refresh → Zahlenbereich-Präferenz gespeichert?
   - User wechseln → Stats korrekt pro User?

4. **Responsive Test**:
   - DevTools: iPad Air Landscape → Grid-Layout aktiv?
   - Mobile (iPhone SE) → Story-Text lesbar?

## Zusammenfassung

**Neue Dateien**: 4 (Component + Service + Model)
**Geänderte Dateien**: 5 (Routes, Stats, Category Overview, Achievements)
**Geschätzte LOC**: ~800 Zeilen (Component: 400, Service: 200, Templates: 200)
**Testing**: 4 Phasen (Funktional, Responsive, Texte, Build)
