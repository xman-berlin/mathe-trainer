
# Refactoring Plan: Mathe-Trainer Codebase

**Plan-Datei:** `docs/plans/2026-02-17_css-refactoring-scss-migration.md`

## Context

Das Projekt hat ~10.000 Zeilen CSS über 21 Dateien mit einer geschätzten Duplikationsrate von 25-30%. Das Styling pro Übung/Device/Richtung ist zu aufwendig und schlecht wartbar: Jede Komponente (exercise, clock-exercise, set-clock-exercise) wiederholt identische Patterns für Back-Buttons, Type-Selector, Streak-Display, Feedback, Badges und Landscape-Layouts. Dazu kommen TypeScript-Duplikation in den Übungskomponenten und nahezu identischer Canvas-Game-Code.

**Ziel:** Vollständiges Refactoring in einem Schritt — Build fixen, SCSS-Migration, gemeinsame Styles/Utilities extrahieren, TypeScript-Duplikation eliminieren, Canvas Games konsolidieren, Dead Code entfernen.

---

## Phase 0: Build-Fix (ZUERST)

**Fehler:** `clock-exercise.css` ist 62 Bytes über dem Budget (16.00 kB Limit).

**Ursache:** Stray `}` auf Zeile 1404 in `src/app/components/clock-exercise/clock-exercise.css` — ein überschüssiger schließender Brace nach dem letzten `@media (max-width: 540px)` Block (Zeile 1403 schließt die Media Query, Zeile 1404 ist orphan).

**Fix:**
1. Zeile 1404 (`}`) in `clock-exercise.css` entfernen
2. Budget in `angular.json` (Zeile 45) von `16kB` auf `20kB` erhöhen — das Refactoring wird die Datei danach deutlich verkleinern; bis dahin ist das Budget ein falsches Constraint

**Kritische Dateien:**
- `src/app/components/clock-exercise/clock-exercise.css` — Zeile 1404 entfernen
- `angular.json` — `maximumError: "16kB"` → `"20kB"` für `anyComponentStyle`

---

## Phase 1: SCSS-Setup und Architektur

### 1.1 SCSS installieren und konfigurieren
```bash
npm install -D sass
```
In `angular.json` den Eintrag `"src/styles.css"` auf `"src/styles.scss"` umstellen. Komponenten-Stylefiles werden beim Refactoring je Datei umgestellt.

### 1.2 SCSS-Partials Struktur erstellen
```
src/styles/
  _variables.scss     # Design Tokens + standardisierte Breakpoints
  _mixins.scss        # Responsive Mixins, Layout Helpers
  _animations.scss    # Confetti, Pulse, Milestone (aktuell 3× dupliziert, ~150 Zeilen)
  _buttons.scss       # Type-Btn, Mode-Btn, Back-Btn, Submit-Btn (8× dupliziert)
  _badges.scss        # Badge-Styles (6× dupliziert, 400+ Zeilen)
  _exercise.scss      # Exercise-Container, Feedback, Stats, Streak
  _modals.scss        # Modal/Overlay-Patterns (3× dupliziert)
src/styles.scss       # Importiert alle Partials (ersetzt styles.css)
```

### 1.3 Standardisierte Breakpoints (aktuell 22+ inkonsistente Queries)
```scss
// _variables.scss
$bp-sm:  540px;   // Small mobile
$bp-md:  768px;   // Tablet
$bp-lg:  1024px;  // Desktop
$bp-landscape-min: 700px;
$bp-landscape-compact-height: 450px;

// _mixins.scss — alle Übungskomponenten nutzen nur diese Mixins
@mixin landscape { @media (orientation: landscape) and (min-width: 700px) { @content; } }
@mixin portrait-tablet { @media (orientation: portrait) and (min-width: 768px) { @content; } }
@mixin mobile { @media (max-width: 768px) { @content; } }
@mixin small-mobile { @media (max-width: 540px) { @content; } }
@mixin compact-landscape { @media (orientation: landscape) and (max-height: 450px) { @content; } }
```

### 1.4 Landscape-Layout-Mixin (aktuell 450-600 Zeilen über 3 Dateien)
```scss
@mixin exercise-landscape-layout($left-col: '1fr', $right-col: '1fr') {
  @include landscape {
    display: grid;
    grid-template-columns: #{$left-col} #{$right-col};
    gap: 1rem 2rem;
    align-items: start;
  }
}
// Verwendung: @include exercise-landscape-layout('300px', '1fr');
```

---

## Phase 2: Komponenten-CSS → SCSS migrieren

### Reihenfolge (größte Dateien zuerst, als Template für die anderen):
1. `clock-exercise.css` → `.scss` (1.408 Zeilen, größte Datei)
2. `exercise.component.css` → `.scss` (1.212 Zeilen)
3. `set-clock-exercise.css` → `.scss` (929 Zeilen)
4. `app.css` → `.scss` (669 Zeilen)
5. `category-home.css` → `.scss` (670 Zeilen)
6. Restliche Dateien

### Was aus jedem File extrahiert wird:
| Pattern | Aktuell | Ziel |
|---------|---------|------|
| `.back-btn` / `.back-home-btn` | 8× dupliziert | `@use '../styles/buttons'` |
| `.type-selector` + `.type-btn` | 5× dupliziert | `@use '../styles/buttons'` |
| `.badge`, `.badge-correct`, `.badge-incorrect` | 6×, 400+ Zeilen | `@use '../styles/badges'` |
| Confetti-Keyframes | 3× | `@use '../styles/animations'` |
| Milestone-Popup | 3× | `@use '../styles/animations'` |
| Landscape 2-Spalten Grid | 3× | `@include exercise-landscape-layout(...)` |
| Modal/Overlay | 3× | `@use '../styles/modals'` |

**Erwartete Reduzierung: ~9.000 → ~5.000 Zeilen (−45%)**

---

## Phase 3: TypeScript-Duplikation eliminieren

### 3.1 `ExerciseStateService` (neu)
**Datei:** `src/app/services/exercise-state.service.ts`

Zentralisiert die in allen 3 Übungskomponenten duplizierten Patterns:
- Streak-Management inkl. Milestone-Erkennung (~300 Zeilen Duplikation)
- Confetti-Trigger-Logik
- Submit/Feedback-Flow inkl. Auto-Advance-Delays (600ms/1200ms)

### 3.2 `createStatsAggregator()` Utility (neu)
**Datei:** `src/app/utils/stats-aggregator.ts`

Eliminiert 120 Zeilen duplizierten `computed()`-Code für `typeCorrectCount`, `typeIncorrectCount`, `typeTotalCount` in 4 Komponenten.

---

## Phase 4: Canvas Game Base Class

**Datei:** `src/app/components/games/base-game.component.ts` (neu)

Eliminiert ~800 Zeilen Duplikation (200 pro Spiel) durch Extraktion von:
- `initCanvas()` — 100% identisch in allen 4 Spielen
- `startGameLoop()` / `stopGameLoop()` — 100% identisch
- `endGame()` + High-Score-Speicherung — 100% identisch
- `gameState`, `score`, `highScore`, `isNewHighScore` Signals

Migrationsreihenfolge: `balloon-pop` → `dino-run` → `breakout` → `flappy-fox`

---

## Phase 5: Dead Code Cleanup

| Aufgabe | Datei | Aktion |
|---------|-------|--------|
| 166 `console.log` entfernen | 11 Dateien | Löschen (nur `console.error`/`warn` behalten) |
| Disabled Badges | `badge.service.ts` L41-45, L130-134 | Entfernen |
| Identity-Funktionen | `stats.service.ts` L495-508 | Löschen |
| ESLint `no-console` Rule | `.eslintrc` | Hinzufügen |

---

## Implementierungs-Reihenfolge (Tasks)

- [x] Phase 0: Build-Fix — stray `}` entfernen + Budget erhöhen
- [x] Plan-Datei nach `docs/plans/2026-02-17_css-refactoring-scss-migration.md` schreiben
- [x] Phase 1: `npm install -D sass`, `angular.json` auf `styles.scss` umstellen
- [x] Phase 1: SCSS-Partials Verzeichnis + alle 7 Partial-Dateien erstellen
- [x] Phase 2: `clock-exercise.css` → `.scss` migrieren
- [x] Phase 2: `exercise.component.css` → `.scss` migrieren
- [x] Phase 2: `set-clock-exercise.css` → `.scss` migrieren
- [x] Phase 2: `app.css` + restliche Komponenten migrieren
- [x] Phase 3: `ExerciseStateService` erstellen + in 3 Übungskomponenten integrieren
- [x] Phase 3: `createStatsAggregator()` Utility erstellen + in 4 Komponenten nutzen
- [x] Phase 4: `BaseGameComponent` erstellen + 4 Spiele migrieren
- [x] Phase 5: Dead Code Cleanup (console.logs, disabled badges, Identity-Funktionen)
- [x] Lint + Build-Check (`npm run lint && npm run build`)

---

## Verifikation

1. `npm run lint` → Keine Fehler
2. `npm run build` → Keine Fehler (Budget-Warnungen OK)
3. Visueller Check auf 4 Devices/Orientierungen:
   - iPhone portrait + landscape
   - iPad Air portrait + landscape
   - Desktop (1920px)
4. Alle Übungen (Rechnen, Uhr ablesen, Zeiger setzen) durchspielen
5. Stats-Persistenz nach Reload prüfen

---

## Erwartete Ergebnisse

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| CSS-Zeilen gesamt | ~9.000 | ~5.000 (−45%) |
| Breakpoint-Varianten | 22+ inkonsistent | 5 Mixins |
| Badge-Styles | 6× dupliziert | 1× Partial |
| Landscape-Grid | 3× ~150 Zeilen | 1× Mixin-Aufruf |
| console.logs | 166 | 0 |
| Streak-Logic | 3× dupliziert | 1× Service |
| Stats Aggregation | 4× dupliziert | 1× Utility |
| Canvas Game Boilerplate | 4× ~200 Zeilen | 1× Base Class |
