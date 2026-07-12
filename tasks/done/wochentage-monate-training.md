# Plan: Multiple-Choice Wochentage & Monate Training

## Ziel
Zwei neue Lernübungen unter `/deutsch/wochentage` und `/deutsch/monate` — Multiple-Choice Wissensfragen zu Reihenfolge und Position der Wochentage und Monate. Keine Rechtschreibung.

## Architektur

**Eine gemeinsame Exercise-Komponente** `SequenceExerciseComponent`, gesteuert über Route-Data:

| Route | Route-Data | Stats-Type |
|---|---|---|
| `/deutsch/wochentage` | `{type: 'weekdays'}` | `deutsch-wochentage` |
| `/deutsch/monate` | `{type: 'months'}` | `deutsch-monate` |

**Stats + Coins** automatisch integriert via `StatsService.recordResult()`:
- `deutschCorrectCount` aggregiert über `startsWith('deutsch-')` → zählt automatisch mit
- 1 Coin pro richtiger Antwort
- Tagesziel-Bonus (10 Coins) bei erreichtem Deutsch-Tagesziel
- Persistiert in localStorage + Supabase

## 4 MC-Fragetypen

### Typ 1 — Vorher/Nachher
„Welcher Wochentag kommt **nach** Mittwoch?" → Donnerstag
„Welcher Monat kommt **vor** Mai?" → April

### Typ 2 — Position
„Welcher Wochentag ist der **3.** Tag der Woche?" → Mittwoch
„Welcher Monat ist der **6.** Monat des Jahres?" → Juni

### Typ 3 — Lücke füllen
Dreier-Kette mit einer Lücke an Position 0, 1 oder 2:
„Sonntag → \_\_\_ → Dienstag" → Montag
„März → \_\_\_ → Mai" → April

### Typ 4 — Beschreibung
„An diesem Wochentag beginnt die Schule wieder nach dem Wochenende." → Montag
„Dieser Monat ist der letzte Monat des Jahres und es gibt Plätzchen." → Dezember

## Wortdaten

### Wochentage
```typescript
[
  { id: 1, name: 'Montag', description: 'Der erste Tag der Woche. Die Schule beginnt wieder.' },
  { id: 2, name: 'Dienstag', description: 'Der zweite Tag der Woche.' },
  { id: 3, name: 'Mittwoch', description: 'Der dritte Tag der Woche, auch "Mitten in der Woche" genannt.' },
  { id: 4, name: 'Donnerstag', description: 'Der vierte Tag der Woche.' },
  { id: 5, name: 'Freitag', description: 'Der fünfte Tag der Woche. Das Wochenende steht vor der Tür!' },
  { id: 6, name: 'Samstag', description: 'Der sechste Tag der Woche. Keine Schule!' },
  { id: 7, name: 'Sonntag', description: 'Der siebte und letzte Tag der Woche.' },
]
```

### Monate
```typescript
[
  { id: 1, name: 'Januar', description: 'Der erste Monat des Jahres. Es ist kalt und oft liegt Schnee.' },
  { id: 2, name: 'Februar', description: 'Der zweite Monat des Jahres. Er hat nur 28 oder 29 Tage.' },
  { id: 3, name: 'März', description: 'Der dritte Monat. Der Frühling beginnt.' },
  { id: 4, name: 'April', description: 'Der vierte Monat. April, April!' },
  { id: 5, name: 'Mai', description: 'Der fünfte Monat. Alles blüht.' },
  { id: 6, name: 'Juni', description: 'Der sechste Monat. Die Sommerferien beginnen bald.' },
  { id: 7, name: 'Juli', description: 'Der siebte Monat. Sommerferien!' },
  { id: 8, name: 'August', description: 'Der achte Monat. Es ist warm.' },
  { id: 9, name: 'September', description: 'Der neunte Monat. Die Schule beginnt wieder.' },
  { id: 10, name: 'Oktober', description: 'Der zehnte Monat. Die Blätter fallen von den Bäumen.' },
  { id: 11, name: 'November', description: 'Der elfte Monat. Es wird kälter.' },
  { id: 12, name: 'Dezember', description: 'Der zwölfte und letzte Monat. Weihnachten!' },
]
```

## Dienst: `sequence.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class SequenceService {
  generateQuestion(type: 'weekdays' | 'months'): Question {
    // 1. Wähle zufällig einen Fragetyp (1-4)
    // 2. Generiere Frage + richtige Antwort basierend auf Datenset
    // 3. Generiere 3 Distraktoren (andere Items aus selbem Set)
    // 4. Mische Optionen, gebe Question zurück
    // Question = { type, question, options: string[], correctIndex: number }
  }
}
```

## Component: `sequence-exercise/`

Gleiches Muster wie Rechtschreibung (`DeutschRechtschreibungComponent`), aber:
- Statt LetterKeypad → 4 MC-Buttons
- Statt `userAnswer`-Signal → `selectedOption`-Signal
- `submitAnswer()` → prüft `selectedOption === correctIndex`
- Kein TTS (Text-to-Speech)

### Template-Skizze
```html
<a routerLink="/deutsch" class="back-home-btn">← Zurück</a>
<main class="exercise-main">
  <h1>📅 Wochentage</h1>
  <div class="question-area">
    <p class="question-text">{{ question() }}</p>
    <div class="options-grid">
      @for (opt of options(); track opt; let i = $index) {
        <button (click)="selectAnswer(i)"
                [class.selected]="selectedOption() === i"
                [disabled]="keypadDisabled()"
                class="option-btn"
                [class.correct]="feedback() === 'correct' && selectedOption() === i"
                [class.incorrect]="feedback() === 'incorrect' && selectedOption() === i">
          {{ opt }}
        </button>
      }
    </div>
  </div>
  <!-- rest wie Rechtschreibung: Feedback, Streak, Milestone, Confetti, Stats -->
</main>
```

## Dateien

### Neu (5)
| Datei | Inhalt |
|---|---|
| `src/app/services/sequence.service.ts` | SequenceService: Wortdaten + Question-Generator |
| `src/app/components/sequence-exercise/sequence-exercise.ts` | SequenceExerciseComponent |
| `src/app/components/sequence-exercise/sequence-exercise.html` | Template mit MC-UI |
| `src/app/components/sequence-exercise/sequence-exercise.scss` | Styles |
| `src/app/components/sequence-exercise/sequence-exercise.spec.ts` | Tests |

### Modifiziert (3)
| Datei | Änderung |
|---|---|
| `src/app/app.routes.ts` | 2 neue Routes + Import |
| `src/app/components/vocab-category-overview/vocab-category-overview.html` | 2 neue Action-Karten |
| `src/app/components/vocab-category-overview/vocab-category-overview.scss` | Farben für neue Karten |

## Exercise-Ablauf
1. `ngOnInit()` → `generateQuestion()` für ersten Question
2. Frage + 4 Optionen anzeigen
3. User klickt Option → `selectAnswer(i)`
4. Feedback anzeigen:
   - **Richtig**: Option grün + ✓ + `streak++`
   - **Falsch**: gewählte rot ✗, richtige grün ✓, `streak = 0`
5. `statsService.recordResult(isCorrect, type)`
6. `exerciseState.handleResult(isCorrect, advance, 1000ms, 2000ms)`
7. `advance()` → `generateQuestion()` für nächste Runde
8. Unten: Statistik + Streak (identisch zu Rechtschreibung)

## Checkable Items
- [x] Task-Datei erstellt
- [x] `sequence.service.ts` — alle 4 Question-Typen, korrekte Distraktoren
- [x] `sequence-exercise.ts` — Component mit `inject()`, Signals, OnInit, OnDestroy
- [x] `sequence-exercise.html` — MC-UI + Feedback + Streak + Stats
- [x] `sequence-exercise.scss` — responsive 2x2-Grid für Optionen
- [x] `sequence-exercise.spec.ts` — Tests (24 Unit-Tests)
- [x] `sequence.service.spec.ts` — Tests (15 Unit-Tests)
- [x] `app.routes.ts` — Routes + Import
- [x] `vocab-category-overview.html` — Action-Karten
- [x] `vocab-category-overview.scss` — Weekdays/Months Card-Farben
- [x] `e2e/navigation.spec.ts` — 2 neue E2E Navigations-Tests
- [x] Lint & Build erfolgreich
- [x] Tests erfolgreich (699 SUCCESS, 0 FAILED)
- [x] E2E Tests erfolgreich (6 passed in Navigation Deutsch)
- [x] Browser-Test mit TomKaiser user (Puppeteer)

## Review
- **Fragetypen**: 4 Typen (Vorher/Nachher, Position, Lücke, Beschreibung) — alle im Test bestätigt
- **Distraktoren**: 3 zufällige andere Items aus selbem Set, korrekte Namen validiert
- **Stats + Coins**: Automatisch über `deutsch-` Prefix — `recordResult()` persistiert in localStorage + Supabase
- **UI responsive**: Optionen in 2x2-Grid (Landscape/Tablet), 1 Spalte (Portrait klein)
- **Wiederverwendung**: Gleiches Styling wie Rechtschreibung (Streak, Milestone, Confetti, Stats-Badges, Back-Button)
- **Services**: `SequenceService` als reine TypeScript-Klasse ohne Supabase-Dependenz

## Änderungen an bestehenden Dateien
| Datei | Änderung |
|---|---|
| `src/app/app.routes.ts` | 2 neue Routes (wochentage, monate) |
| `src/app/components/vocab-category-overview/vocab-category-overview.html` | 4 Lern-Karten (Rechtschreibung, Hangman, Wochentage, Monate) + Admin-Link "Wortlisten verwalten" im Hero |
| `src/app/components/vocab-category-overview/vocab-category-overview.scss` | .weekdays-card, .months-card, .hero-admin-link; entfernt: .manage-card |
| `e2e/navigation.spec.ts` | 2 neue Navigations-Tests; "verwalten"-Test aktualisiert auf neuen Link-Text |
