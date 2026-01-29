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

## Development Notes

- **Signals over RxJS**: Use `signal()` for state, `computed()` for derived values
- **CSS Variables**: Use the defined color variables (e.g., `--bright-blue`, `--gray-900`)
- **GitHub Pages**: Production uses `base href="/mathe-trainer/"`, local dev uses `/`
- **Mobile-first**: Responsive breakpoints at 1024px, 768px, 540px
- **Standalone components**: All components use `standalone: true`
