# AGENTS.md — Schlaufuchs

Angular 20 zoneless SPA (standalone components, signals). Learning app for kids (Mathe, Uhrzeit, Deutsch) with Supabase sync.

## Commands

```bash
npm start                    # Dev server → http://localhost:4200 (live-reload)
npm run start:poll           # Poll mode (reliable file watching)
npm run start:hmr            # HMR dev server (development config)
npm run watch                # Build watch mode (development config)
npm run build                # Production build → dist/schlaufuchs/browser/
npm run lint                 # ESLint on src/**/*.ts + src/**/*.html
npm run test                 # Karma + Jasmine unit tests
npm run test -- --watch=false --browsers=ChromeHeadless  # CI: once, headless
npm run test -- --watch=false --browsers=ChromeHeadless --code-coverage  # CI with coverage
npm run test -- --include="**/foo.spec.ts"               # Single spec file
npm run e2e                  # Playwright E2E (auto-starts dev server if not running)
npm run e2e:ui               # Playwright with UI mode
npx kill-port 4200           # Kill stuck dev server
```

## Pre-commit gates (always run in order)

1. `npm run lint`
2. `npm run build` (ignore budget warnings < 500KB / < 12KB component style)
3. `npm run test -- --watch=false`
4. `npm run e2e` (if E2E changed)

## Architecture

- **3 categories**: `mathe/*` (addition/subtraction/multiplication/division/sachaufgaben), `uhrzeit/*` (clock), `deutsch/*` (spelling, hangman, vocab management)
- **Games**: `spielen/flappy-fox`, `dino-run`, `breakout`, `balloon-pop`
- **Entrypoint**: `src/main.ts` bootstraps standalone `App` with `appConfig`
- **Routes** (`src/app/app.routes.ts`): all guarded by `authGuard` except `/login`
- **Root component**: `src/app/app.ts` — renders `<router-outlet>`, tracks daily goal confetti
- **Deploy output**: `dist/schlaufuchs/browser/` (not `dist/`)
- **CI matrix**: Node 22.x and 24.x (not 18/20)

## Key routes

| Path | Component / Note |
|---|---|
| `mathe/sachaufgaben` | `WordProblemExerciseComponent` |
| `erfolge` | `GlobalAchievementsComponent` (tabs: Mathe / Uhrzeit / Badges / Spiele) |
| `mathe/erfolge`, `uhrzeit/erfolge` | Redirect → `/erfolge?tab=math` / `?tab=clock` |
| `vokabeln`, `uebung`, `zeitrennen` | Compat redirects to new routes |

## Patterns

- **Signals for all UI state** — never use RxJS `BehaviorSubject` for UI; avoid `ChangeDetectorRef` (zoneless)
- **`inject()` everywhere** — no constructor DI in new code (exception: `effect()` in constructors is fine)
- **Immutable signal updates** — spread, never mutate signal values directly
- **Style**: `styleUrl: './foo.scss'` (singular, new Angular convention)
- **SCSS** partials in `src/styles/`: `_variables.scss`, `_mixins.scss`, `_animations.scss`, `_badges.scss`, `_buttons.scss`, `_exercise.scss`, `_modals.scss`
- **Breakpoints**: 540px (small mobile), 768px (tablet), 1024px (desktop), 700px (landscape min)
- **`localStorage`** for offline/cache, Supabase for cloud sync (background, non-blocking)
- **Auth localStorage key**: `'schlaufuchs-current-user'`
- **Division semantics**: `operandA` = dividend, `answer` = quotient; cap `operandA` (not `answer`) for range checks; cap `answer` (= product) for multiplication

## appConfig

`src/app/app.config.ts` provides: `provideBrowserGlobalErrorListeners()`, `provideZonelessChangeDetection()`, `provideRouter(routes)`.

## Testing quirks

- All specs need `provideZonelessChangeDetection()` in `TestBed.configureTestingModule`
- Mock `localStorage` with `spyOn(localStorage, ...)` for services that persist
- Signal-driven effects require `TestBed.flushEffects()` to trigger
- Service deps to mock: `SupabaseService`, `AuthService`, `DailyStreakService`, `CoinsService`, `BadgeService`, `DifficultyService`, `TimedChallengeService`, `AchievementsService`, `ProblemGeneratorService`, `ExerciseStateService`, `GameService`, `MigrationService`, `WordProblemService`, `AvatarService`, `VocabService`
- When adding a new service with signals, update mocks in ALL existing specs that provide it — missing mock signals break unrelated tests

## E2E quirks

- Playwright auto-starts `npm run start` via `webServer` config — no manual server needed locally
- Only Chromium is tested (no Firefox, no Safari)
- CI: 2 retries, 1 worker, `forbidOnly`
- All specs use `bypassLogin(page)` + `handleMigrationDialog(page)` from `e2e/helpers.ts` in `beforeEach`
- `setUserDirectly(page)` injects `'schlaufuchs-current-user'` via `page.evaluate` for immediate-auth pages
- Every new route must have a click-through test in `e2e/navigation.spec.ts` — navigate by clicking UI links (never `page.goto()`) to catch broken `routerLink` bindings

## GitHub Pages SPA redirect

- `public/404.html` encodes the current path as query param; `src/index.html` restores it on load — this is how `/mathe-trainer/` SPA routing works on GitHub Pages without a server
- Both files are required; breakage here breaks deep-linking

## Lint

- Config is `eslint.config.js` (flat config, not `.eslintrc.json`)
- `no-console` allows only `warn`, `error` (not `log`)
- Component selector: `app` prefix, kebab-case for elements, camelCase for attributes
- Unused variables ignored when prefixed `_`
- HTML accessibility rules enabled (`templateAccessibility`) — new templates must pass a11y lint

## Prettier

Config in `package.json`: `printWidth: 100`, `singleQuote: true`, Angular HTML parser for templates.

## Supabase

- **Local dev**: `http://127.0.0.1:54321` (config in `src/environments/environment.ts`)
- RLS enabled on all tables. Service role key never used in frontend.
- Migrations in `supabase/migrations/` (SQL); `src/sql/` for local scripts
- Environment files committed with local-only keys (anon key is public); never commit service role keys or secrets

## Session Start

At the start of every session or initialization, load relevant skills via the skill tool:

- `commit-and-push` — commit/push workflow with quality gates
- `finish-feature` — complete and close a feature
- `codebase-audit` — deep codebase analysis
- `customize-opencode` — opencode configuration (built-in)
- `wm-tipp` — WM-Tipp skill

Also review `tasks/lessons.md` before starting any work.

## Task tracking

- `tasks/todo.md` — index of active feature files
- `tasks/<feature>.md` — plan with checkboxes
- `tasks/done/<feature>.md` — completed features
- `tasks/lessons.md` — append-only lessons log (review at session start)

## Critical

- **UI text must be German**, code in English, commit messages in English
- **Commit and push only on explicit command** — never autonomously
- **Zoneless**: no `ChangeDetectorRef`, `NgZone`, or `zone.js` patterns
- **Prod base href**: `/mathe-trainer/` (set via `--base-href` in deploy workflow)
- **Budget warnings** (< 500KB initial, < 12KB per component style) are acceptable
- Run the full test suite after any service change — new signals break unrelated specs silently
