# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Schlaufuchs is an interactive learning app for elementary school students, built with Angular 20+ (zoneless, standalone components) and TypeScript. It provides math exercises (addition, subtraction, multiplication, division) and clock/time learning with a mobile-friendly interface.

**Live:** https://xman-berlin.github.io/mathe-trainer/

## Commands

```bash
# Development
npm run start          # Dev server at http://localhost:4200
npm run start:poll     # Dev server with polling (recommended for reliable file watching)
npm run start:hmr      # Hot module replacement

# Build & Test
npm run build          # Production build (outputs to dist/)
npm run test           # Unit tests with Karma/Jasmine
npm run lint           # ESLint
```

## Architecture

### Key Technologies
- **Angular 20** with zoneless change detection (`provideZonelessChangeDetection()`)
- **Signals** for all reactive state (no RxJS for UI state)
- **localStorage** for daily statistics persistence

### Core Structure
- `src/app/app.ts` - Root component with navigation and stats display
- `src/app/app.routes.ts` - Router configuration (home, addition, subtraction)
- `src/app/services/stats.service.ts` - Daily statistics with per-exercise-type tracking
- `src/app/components/` - Exercise components (addition, subtraction)

### StatsService Pattern
The `StatsService` tracks daily statistics using signals and localStorage:
- Auto-resets at midnight
- Stores stats per exercise type (addition, subtraction, etc.)
- Call `recordResult(isCorrect: boolean, exerciseType: string)` to track answers

### Exercise Component Pattern
Each exercise component (addition, subtraction) follows the same structure:
- Signals for operands, user answer, and feedback state
- Custom numpad for mobile input
- Auto-advance after feedback (600ms correct, 1200ms incorrect)
- Computed signals for type-specific stats

## Responsive Design

### Breakpoints
- **Desktop**: > 1024px
- **Tablet Landscape**: 768-1024px with `orientation: landscape`
- **Tablet Portrait**: 768-1024px
- **Mobile**: < 768px
- **Small Mobile**: < 540px

### Tablet Landscape Optimizations

#### Clock Exercise (`clock-exercise.css`)
**Problem**: Vertical layout exceeded viewport height (~750px) on tablet landscape, requiring scrolling.

**Solution**: Horizontal 2-column CSS Grid layout
- **Container**: Expanded from 600px to 1000px max-width
- **Left column (320px)**: Clock display (rows 1-3) + Streak display (row 4)
- **Right column (1fr)**: Type selector, question, input, keypad, feedback
- **Result**: ~250px height reduction (33%), all content visible without scrolling

**Key changes**:
```css
@media (min-width: 768px) and (max-width: 1024px) and (orientation: landscape)
```
- Grid: `grid-template-columns: 320px 1fr`
- Clock size: 260px (between mobile 220px and desktop 300px)
- Reduced padding and font sizes for compact layout
- Margin-top: 4rem → 1.5rem

#### Clock Display Component (`clock-display.css`)
- Clock SVG: 260px for tablet landscape (optimal between mobile 220px and desktop 300px)
- Hour numbers: 13px font-size

#### Category Overview (`category-overview.css`)
**Solution**: Horizontal 2-column layout for better space utilization

**Layout**:
- **Left column (340px)**: Stats card with daily progress
- **Right column (1fr)**: Action cards in vertical stack

**Key changes**:
- Hero padding reduced: 4rem → 2.5rem (top), 2rem → 1.5rem (bottom)
- Hero h1: 2.5rem → 2rem
- Action cards: Changed to horizontal layout (icon left, text right)
- Stats card: More compact (padding 1.5rem → 1.2rem)
- All content visible on one screen without scrolling

### Pattern for Future Tablet Landscape Optimizations
When optimizing components for tablet landscape:
1. Use CSS Grid with horizontal splits (typically 300-400px left column + flexible right)
2. Position static/visual elements on the left (charts, displays, stats)
3. Position interactive elements on the right (inputs, buttons, forms)
4. Reduce vertical padding and margins by ~30-40%
5. Reduce font sizes by 10-15%
6. Test on iPad Air (820×1080) and iPad Pro 11" (1024×768) landscape

## Development Notes

- **Signals over RxJS**: Use `signal()` for state, `computed()` for derived values
- **CSS Variables**: Use the defined color variables (e.g., `--bright-blue`, `--gray-900`)
- **GitHub Pages**: Production uses `base href="/mathe-trainer/"`, local dev uses `/`
- **Mobile-first**: Responsive breakpoints at 1024px, 768px, 540px
- **Standalone components**: All components use `standalone: true`
- **Commit and push**: Commit and push changes only on my command

## Dateikonventionen

- **SQL Scripts**: Alle SQL-Dateien (Migrationen, Queries) werden in `src/sql/` gespeichert
  - Benennung: `YYYY-MM-DD_beschreibung.sql` (z.B. `2026-02-05_add-badges-table.sql`)
- **Planungsdokumente**: Implementierungspläne in `docs/plans/` speichern
  - Benennung: `YYYY-MM-DD_feature-name.md` (z.B. `2026-02-04_gamification-system.md`)
  - Jeder Plan muss eine Taskliste mit Checkboxen enthalten (`- [ ]` / `- [x]`)
  - Bei Abarbeitung werden Tasks im Plan als erledigt markiert
- **Testdaten**: Mock-Daten und Fixtures in `src/test-data/`

## Sprachkonventionen

- **Code**: Englisch (Variablen, Funktionen, Kommentare)
- **UI-Texte**: Deutsch (Labels, Buttons, Fehlermeldungen)
- **Commit-Messages**: Englisch
- **Dokumentation**: Deutsch oder Englisch je nach Zielgruppe

## Supabase

- **Projekt URL**: In `environment.ts` (nicht committen!)
- **Anon Key**: Öffentlich, in `environment.ts`
- **Service Role Key**: NIE im Frontend verwenden
- **RLS aktiviert**: Alle Tabellen haben Row Level Security
- **Migrationen**: In `src/sql/` mit Datum-Prefix

## Umgebungsvariablen

- `.env` und `environment.ts` NIE committen (in `.gitignore`)
- Secrets in GitHub Secrets für CI/CD
- Lokale Entwicklung: `environment.development.ts` als Vorlage nutzen
- Produktions-URLs werden beim Build über GitHub Actions gesetzt

## Testing

- Unit Tests für alle Services (`*.service.spec.ts`)
- Component Tests für komplexe UI-Logik
- Vor Commit: `npm run lint && npm run build` muss erfolgreich sein
- CI prüft automatisch Lint und Build

## Git Workflow

- **Branch-Namen**: `feature/beschreibung`, `fix/beschreibung`
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`)
- **Vor Push**: `npm run lint && npm run build`
- **Commits nur auf Anfrage**: Nicht automatisch committen

## Known Issues

- Budget-Warnungen beim Build sind akzeptabel (Bundle > 500KB)
- File Watching: `npm run start:poll` bei Problemen verwenden
- Zoneless Angular: `ChangeDetectorRef` nicht verwenden, stattdessen Signals
