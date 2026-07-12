# Schlaufuchs 🦊

An interactive learning app for mathematics and time-telling, built with Angular and TypeScript.

**🌐 Live Demo:** [https://xman-berlin.github.io/mathe-trainer/](https://xman-berlin.github.io/mathe-trainer/)

## 📖 About the Project

Schlaufuchs is a web-based application that helps elementary school students improve their mathematical skills and learn to read the clock. The project was created with [Angular CLI](https://github.com/angular/angular-cli) version 20.3.4 and uses modern web technologies.

### ✨ Features

- **Math Exercises**: Addition, Subtraction, Multiplication, Division, Word Problems
- **Time Learning**: Analog and digital clock exercises with detailed minute tick marks on the interactive clock face; Zeiger-Setzen now includes 7 exercise types (full hour, half, quarter, 5-min, minutes-after, minutes-before, vor/nach-halb) with auto-positioned hour hand for the three new types; type selection persists across sessions
- **Deutsch / Rechtschreibung**: German spelling exercises — TTS speaks a word, pupils type it on a QWERTZ keyboard; full streak, daily stats, and goal tracking; smart session phases prioritise the active vocab list until mastered (weight cap 5)
- **Deutsch / Wochentage + Monate**: Multiple-Choice Wissensfragen zu Reihenfolge und Position der Wochentage und Monate — 4 Fragetypen (Vorher/Nachher, Position, Lücke, Beschreibung)
- **Deutsch / Wörter Raten**: Word guessing game (hangman-style) — guess letters to reveal words from vocab lists; caterpillar figure shows remaining guesses; word weights unaffected by hangman results
- **Zahlenraum**: Configurable number range (≥ 100) for all math exercises, set via gear icon on the Mathe overview page; persisted per user in Supabase and localStorage. At Zahlenraum ≤ 100, multiplication and division are restricted to the small times table (factors 1–10, product ≤ 100). User cache is kept in sync after saving so the setting survives page refresh.
- **Adaptive Difficulty**: Per-type difficulty levels (🐭 Maus → 🐉 Drache, 6 tiers) that automatically adjust based on performance — level up after 5 correct in a row, level down after 3 of last 5 wrong; persisted to Supabase
- **Gamification**: Badge system with 34+ badges, coin collection, streak tracking, bronze lock (exercise types become permanent once ≥100 lifetime correct answers reached)
- **Mini-Games**: Flappy Fox, Dino Run, Breakout, Balloon Pop
- **Achievements**: Medal system, personal best times, streak milestones
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Offline Support**: localStorage for statistics and progress
- **Supabase Integration**: Cloud sync for user data, badges, and scores

## 🚀 Quick Start

### Prerequisites

- Node.js (Version 18.x or 20.x)
- npm (comes with Node.js)
- Angular CLI: `npm install -g @angular/cli`

### Installation

```bash
# Clone repository
git clone https://github.com/xman-berlin/mathe-trainer.git
cd schlaufuchs

# Install dependencies
npm install

# Start development server
ng serve
```

The application will be available at `http://localhost:4200/`.

## 💻 Development

### Development Server

```bash
ng serve
```

The server starts at `http://localhost:4200/` and automatically reloads when files change.

### Code Scaffolding

Create a new component:
```bash
ng generate component components/component-name
```

Create a new service:
```bash
ng generate service services/service-name
```

Show all available schematics:
```bash
ng generate --help
```

### Build

Create production build:
```bash
ng build
```

Build artifacts will be stored in the `dist/` directory.

### Tests

Run unit tests:
```bash
ng test
```

Tests with code coverage:
```bash
ng test --code-coverage
```

Run E2E tests (Playwright):
```bash
npx playwright test
```

### Linting

Check code quality:
```bash
ng lint
```

## 📁 Project Structure

```
schlaufuchs/
├── src/
│   ├── app/
│   │   ├── components/     # UI components
│   │   ├── services/       # Business logic and data services
│   │   ├── utils/          # Helper functions
│   │   ├── app.ts          # Main component
│   │   ├── app.config.ts   # App configuration
│   │   └── app.routes.ts   # Routing configuration
│   ├── index.html
│   ├── main.ts
│   └── styles.css
├── public/                 # Static assets
├── .github/
│   └── workflows/          # CI/CD Workflows
└── angular.json            # Angular configuration
```

## 🚀 GitHub Actions & CI/CD

This project uses GitHub Actions for Continuous Integration and Deployment:

### CI Workflow
- **Trigger**: On every push or pull request to `main` or `develop`
- **Node.js Versions**: 18.x and 20.x
- **Steps**:
  - Install dependencies (`npm ci`)
  - Linting (`npm run lint`)
  - Build (`npm run build`)
  - Unit tests (`npm test -- --watch=false --browsers=ChromeHeadless`)
  - Code coverage upload to Codecov (optional)

### Deployment Workflow
- **Trigger**: On every push to `main` (or manually)
- **Target**: GitHub Pages
- **Features**:
  - Automatic build with correct `base-href`
  - Deployment via `peaceiris/actions-gh-pages`
  - Production URL: [https://xman-berlin.github.io/mathe-trainer/](https://xman-berlin.github.io/mathe-trainer/)

### Dependabot
- **Updates**: Weekly on Mondays at 09:00
- **Grouping**: Angular packages and development dependencies are grouped
- **Labels**: Automatic addition of `dependencies` label

## 🛠️ Technology Stack

- **Framework**: Angular 20.3.4 (zoneless)
- **Language**: TypeScript
- **Styling**: CSS
- **Testing**: Karma + Jasmine (Unit), Playwright (E2E)
- **Build Tool**: Angular CLI
- **CI/CD**: GitHub Actions
- **Hosting**: GitHub Pages

## 📚 Resources

- [Angular Documentation](https://angular.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Angular CLI Command Reference](https://angular.dev/tools/cli)
- [GitHub Actions Workflows](.github/workflows/)

## 🤝 Contributing

Contributions are welcome! Please create a pull request or open an issue for suggestions.

## 📝 License

This project is created for educational purposes.
