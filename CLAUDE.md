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

### Clock Exercise Layouts

#### clock-exercise (Uhrzeit ablesen)
**Landscape Mode (>700px):**
- **2-column Grid**: Clock left (column 1, rows 1-6), controls right (column 2)
- **Left column**: Time indicators (☀️/🌙) above and below clock, clock uses full width
- **Right column**: Type selector → Question → Input → Keypad → Feedback → Stats → Streak

**Portrait Mode:**
- Vertical stacking: Type selector → Clock with indicators → Input → Keypad → Stats → Streak → Feedback

#### set-clock-exercise (Zeiger setzen)
**Landscape Mode (>700px):**
- **2-column Grid**: Clock left (column 1, rows 1-6), controls right (column 2)
- **Left column**: Interactive clock uses full width (no time indicators needed)
- **Right column**: Type selector (icon only: 60/30/15/05) → Display mode toggle → Target time → Submit button → Feedback → Streak → Stats

**Portrait Mode (IMPORTANT - Element Order):**
1. Type selector (60/30/15/05)
2. Display mode selector (Analog/Text toggle)
3. Target time display
4. Clock (interactive)
5. Submit button (Überprüfen)
6. Stats summary
7. Streak display
8. Feedback area

**Common Patterns:**
- Landscape: Clock always in left column, full width, controls in right column
- Type selector buttons: Icon only (numbers) in landscape, no text labels
- All elements in right column scaled larger to match prominent clock display
- Portrait: Vertical stacking with specific order for set-clock-exercise

## Development Notes

- **Signals over RxJS**: Use `signal()` for state, `computed()` for derived values
- **CSS Variables**: Use the defined color variables (e.g., `--bright-blue`, `--gray-900`)
- **GitHub Pages**: Production uses `base href="/mathe-trainer/"`, local dev uses `/`
- **Mobile-first**: Responsive breakpoints at 1024px, 768px, 540px
- **Standalone components**: All components use `standalone: true`
- **Commit and push**: Commit and push changes only on my command

## File Conventions

- **SQL Scripts**: All SQL files (migrations, queries) are stored in `src/sql/`
  - Naming: `YYYY-MM-DD_description.sql` (e.g., `2026-02-05_add-badges-table.sql`)
- **Planning Documents**: Implementation plans stored in `docs/plans/`
  - Naming: `YYYY-MM-DD_feature-name.md` (e.g., `2026-02-04_gamification-system.md`)
  - Each plan must contain a task list with checkboxes (`- [ ]` / `- [x]`)
  - Tasks are marked as completed when done
  - **IMPORTANT**: When an existing plan is extended (e.g., new phase added), the plan file in the project must be updated accordingly
- **Test Data**: Mock data and fixtures in `src/test-data/`

## Language Conventions

- **Code**: English (variables, functions, comments)
- **UI Text**: German (labels, buttons, error messages)
- **Commit Messages**: English
- **Documentation**: English (as per global CLAUDE.md rule)

## Supabase

- **Project URL**: In `environment.ts` (do not commit!)
- **Anon Key**: Public, in `environment.ts`
- **Service Role Key**: NEVER use in frontend
- **RLS Enabled**: All tables have Row Level Security
- **Migrations**: In `src/sql/` with date prefix

## Environment Variables

- `.env` and `environment.ts` NEVER commit (in `.gitignore`)
- Secrets in GitHub Secrets for CI/CD
- Local development: Use `environment.development.ts` as template
- Production URLs are set during build via GitHub Actions

## Testing

- Unit tests for all services (`*.service.spec.ts`)
- Component tests for complex UI logic
- Before commit: `npm run lint && npm run build` must succeed
- CI automatically checks lint and build

## Git Workflow

- **Branch Names**: `feature/description`, `fix/description`
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`)
- **Commits Only on Request**: Do not commit automatically

### Before Commit and Push (IMPORTANT)

Before a commit or push is performed, the following MUST happen:

1. Run `npm run lint` → Fix linter errors if present
2. Run `npm run build` → Fix build errors if present
3. All errors and warnings (except budget warnings) must be resolved
4. Only when both pass without errors: Perform commit and push

## Known Issues

- Budget warnings during build are acceptable (Bundle > 500KB)
- File Watching: Use `npm run start:poll` if issues occur
- Zoneless Angular: Do not use `ChangeDetectorRef`, use Signals instead

