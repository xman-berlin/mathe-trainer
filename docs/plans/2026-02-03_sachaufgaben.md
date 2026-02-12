# Implementation Plan: Word Problems

## Overview
New subcategory "Word Problems" in the math section with dynamically generated text problems for 2nd grade elementary school.

## Task List

### Phase 1: Models & Service
- [x] Create word-problem.model.ts
- [x] Implement WordProblemService with 8 story templates
- [x] Number generation logic (carrying/borrowing over tens)

### Phase 2: Component
- [x] Create WordProblemExerciseComponent
- [x] Template with story display, input, keypad
- [x] Responsive CSS (incl. tablet landscape)

### Phase 3: Navigation & Routing
- [x] Add route `/mathe/sachaufgaben`
- [x] Action card in category-overview

### Phase 4: Stats & Achievements
- [x] Add 'word-problems' to StatsService mathTypes
- [x] Medals in AchievementsComponent

### Phase 5: Testing & Polish
- [x] Test all 4 operation types
- [x] Verify responsive design
- [x] Build successful

## Requirements
- **4 Operation Types**: Addition, Subtraction, Multiplication, Division (with carrying/borrowing over tens)
- **2 Number Ranges**: "Up to 20" and "Up to 100" (switchable)
- **5-10 Story Templates**: Various contexts (apples, marbles, books, etc.)
- **NO Time Trial Mode** (practice mode only)
- **NO Digit Selection** for multiplication/division
- **Own Medal**: Based on number of word problems solved

## Architecture Decision

**Separate Standalone Component** (`WordProblemExerciseComponent`)

**Rationale**:
- Different UI requirements (multi-line story display vs. simple operands)
- Follows existing pattern (ClockExerciseComponent is also separate)
- Code reuse: KeypadComponent, StatsService, streak logic

## File Structure

### Files to Create

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

### Files to Modify

1. `src/app/app.routes.ts` - Add route
2. `src/app/services/stats.service.ts` - Add 'word-problems' to mathTypes (line 44)
3. `src/app/components/category-overview/category-overview.html` - Action card for word problems (between time trial and achievements)
4. `src/app/components/achievements/achievements.component.ts` - Word-problems to exerciseTypes
5. `src/app/components/achievements/achievements.component.html` - Medal display

## Story Template Design

### Data Model (`word-problem.model.ts`)

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

### Story Templates (8 Total)

**Examples with placeholders `{a}` and `{b}`**:

1. **Apples** 🍎
   - Addition: "Lisa has {a} apples. She gets {b} apples as a gift. How many does she have now?"
   - Subtraction: "Tim has {a} apples. He eats {b} apples. How many does he have left?"
   - Multiplication: "There are {a} baskets with {b} apples each. How many apples in total?"
   - Division: "{a} apples are distributed among {b} children. How many does each child get?"

2. **Marbles** ⚫
3. **Books** 📚
4. **Stickers** ⭐
5. **Cookies** 🍪
6. **Toy Cars** 🚗
7. **Flowers** 🌸
8. **Candies** 🍬

## Number Generation Logic

### Addition
**Up to 20**: Carrying over tens at 10
- Example: 7 + 5 = 12
- Logic: `b ∈ [1,10]`, `ones ∈ [11-b, 9]`, `a = ones`
- Result: 11-19

**Up to 100**: Carrying over tens at any ten boundary
- Example: 47 + 8 = 55
- Logic: As above, plus `tens ∈ [1, floor((100-b)/10)]`, `a = tens*10 + ones`

### Subtraction
**Up to 20**: Borrowing below 10
- Example: 13 - 5 = 8
- Logic: `b ∈ [1,10]`, `ones ∈ [0, b-1]`, `a = 10 + ones`
- Result: 10-19

**Up to 100**: Borrowing from tens
- Example: 52 - 7 = 45
- Logic: As above, plus `tens ∈ [1,9]`, `a = tens*10 + ones`

### Multiplication
**Up to 20**: Small factors, result ≤ 20
- Example: 4 × 5 = 20
- Logic: `a ∈ [2,5]`, `b ∈ [2, floor(20/a)]`

**Up to 100**: Result ≤ 100
- Example: 7 × 12 = 84
- Logic: `a ∈ [2,10]`, `b ∈ [2, floor(100/a)]`

### Division
**Up to 20**: Even division, result ≤ 20
- Example: 20 ÷ 4 = 5
- Logic: `b ∈ [2,5]`, `quotient ∈ [2, floor(20/b)]`, `a = b × quotient`

**Up to 100**: Even division, result ≤ 100
- Logic: `b ∈ [2,10]`, `quotient ∈ [2, floor(100/b)]`, `a = b × quotient`

## UI Components

### Navigation
Route: `/mathe/sachaufgaben`

Action Card in `/mathe` (between time trial and achievements):
```html
<a routerLink="/mathe/sachaufgaben" class="action-card word-problem-card">
  <div class="card-icon">📝</div>
  <h3>Sachaufgaben</h3>
  <p>Löse Textaufgaben mit Geschichten</p>
</a>
```

### Component Layout

**Elements**:
1. **Back Button** (top left) → `/mathe`
2. **Operation Type Selection** (4 buttons: +, −, ×, ÷)
3. **Number Range Toggle** (Up to 20 / Up to 100)
4. **Story Display** (Icon + multi-line text)
5. **Input Field** + Numpad (KeypadComponent, mode='numeric')
6. **Feedback Area** (correct/incorrect with correct answer)
7. **Streak Display** (current + best)
8. **Daily Stats Badge** (bottom)
9. **Milestone Popup** (at 5, 10, 20, 30, 40, 50, 75, 100 streak)

**IMPORTANT**: NO time trial mode, NO digit selection widget

## Implementation Steps

### Phase 1: Models & Service

**1.1 Create Models** (`word-problem.model.ts`)
- Interfaces: `StoryTemplate`, `WordProblem`, `WordProblemType`, `NumberRange`

**1.2 Create WordProblemService** (`word-problem.service.ts`)
- 8 story templates as constants
- `generateProblem(type: WordProblemType, range: NumberRange): WordProblem`
  - Random template selection
  - Number generation according to logic above
  - Placeholder replacement (`{a}`, `{b}`)
  - Anti-repetition (store last 10 problems)
- `calculateAnswer(type, a, b): number`

### Phase 2: Component

**2.1 Component File** (`word-problem-exercise.component.ts`)

**Signals** (adopt from ExerciseComponent):
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

**Methods** (pattern from ExerciseComponent):
- `constructor()`: Inject WordProblemService, StatsService, AchievementsService
- `ngOnInit()`: Load number range from localStorage
- `generateProblem()`: Call service, store problem in signal, reset userAnswer
- `submitAnswer()`:
  - Validation
  - Check correctness
  - Update streak
  - Record stats: `this.stats.recordResult(isCorrect, 'word-problems')`
  - Show feedback (600ms correct, 1200ms incorrect)
  - Auto-advance
- `toggleType(type: WordProblemType)`: Toggle type on/off, regenerate problem
- `setNumberRange(range: NumberRange)`: Set range, save to localStorage, regenerate
- Milestone logic (copy from ExerciseComponent)

**2.2 Template** (`word-problem-exercise.component.html`)

**Structure** (based on exercise.component.html):
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

**Base CSS** copy from exercise.component.css, adjustments:
- `.story-display`: Centered, larger font (1.25rem), max 600px width
- `.story-icon`: Large emoji display (3rem font-size)
- `.story-text`: Multi-line, line-height 1.6
- `.range-selector`: Button group with active state
- `.word-problem-card`: Purple theme (#8B5CF6)

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

**3.1 Add Route** (`app.routes.ts`)

Insert after line 21:
```typescript
{
  path: 'mathe/sachaufgaben',
  component: WordProblemExerciseComponent,
  data: { mode: 'practice' },
  canActivate: [authGuard]
},
```

Add import (line 7):
```typescript
import { WordProblemExerciseComponent } from './components/word-problem-exercise/word-problem-exercise.component';
```

**3.2 Action Card** (`category-overview.html`)

Insert after line 62 (between "Time Trial" and "Achievements"):
```html
@if (category() === 'math') {
  <a routerLink="/mathe/sachaufgaben" class="action-card word-problem-card">
    <div class="card-icon">📝</div>
    <h3>Sachaufgaben</h3>
    <p>Löse Textaufgaben mit Geschichten</p>
  </a>
}
```

**3.3 Card Styling** (`category-overview.css`)

Add at end of file:
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

Change line 44:
```typescript
private readonly mathTypes = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'word-problems'  // NEW
];
```

**4.2 Achievements Component** (`achievements.component.ts`)

Extend `exerciseTypes` array (around line 30):
```typescript
{ key: 'word-problems', label: 'Sachaufgaben', icon: '📝' }
```

**4.3 Achievements Template** (`achievements.component.html`)

Add medal section for word-problems (after existing sections):
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

**5.1 Test Functionality**
- All 4 operation types with both number ranges
- Verify carrying/borrowing over tens
- Streak functionality (milestones at 5, 10, 20, ...)
- Stats persistence (localStorage + server)
- Medal progression (100/500/1000)

**5.2 Test Responsive Design**
- Mobile (< 768px)
- Tablet Portrait (768-1024px)
- Tablet Landscape (768-1024px landscape) - Grid layout
- Desktop (> 1024px)

**5.3 Text Review**
- All 8 templates for correct German grammar
- Icon display on various devices

## Critical Files (Reference)

**To Read as Patterns**:
- `/Users/xman/projects/test/mathe-trainer/src/app/components/exercise/exercise.component.ts:0-100` - Signal structure, streak logic
- `/Users/xman/projects/test/mathe-trainer/src/app/services/clock.ts` - Service pattern for problem generation
- `/Users/xman/projects/test/mathe-trainer/src/app/components/clock-exercise/clock-exercise.css` - Tablet landscape grid layout

**To Modify**:
- `/Users/xman/projects/test/mathe-trainer/src/app/app.routes.ts:21` - Insert route
- `/Users/xman/projects/test/mathe-trainer/src/app/services/stats.service.ts:44` - Extend array
- `/Users/xman/projects/test/mathe-trainer/src/app/components/category-overview/category-overview.html:62` - Add card
- `/Users/xman/projects/test/mathe-trainer/src/app/components/achievements/achievements.component.ts` - Extend exerciseTypes
- `/Users/xman/projects/test/mathe-trainer/src/app/components/achievements/achievements.component.html` - Medal section

## Verification

After implementation:

1. **Manual Test**:
   - Start app: `npm run start:poll`
   - Navigate to `/mathe` → Word problems card visible between time trial and achievements?
   - Solve problem → Stats in `/mathe/erfolge` correct?

2. **Build Test**:
   - `npm run build` → successful?
   - `npm run lint` → no errors?

3. **Functional Test**:
   - Switch number range → new problems in correct range?
   - 5 correct → Milestone popup appears?
   - Browser refresh → Number range preference saved?
   - Switch user → Stats correct per user?

4. **Responsive Test**:
   - DevTools: iPad Air Landscape → Grid layout active?
   - Mobile (iPhone SE) → Story text readable?

## Summary

**New Files**: 4 (Component + Service + Model)
**Modified Files**: 5 (Routes, Stats, Category Overview, Achievements)
**Estimated LOC**: ~800 lines (Component: 400, Service: 200, Templates: 200)
**Testing**: 4 phases (Functional, Responsive, Text, Build)
