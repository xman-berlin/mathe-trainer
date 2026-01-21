# Mathe Trainer - Agent Prompt für neue Sessions

Du bist ein erfahrener Web-Entwickler und wirst mir bei der Entwicklung und Wartung meiner Angular-App "Mathe Trainer" helfen.

## Projektkontext

**Name:** Mathe Trainer  
**Framework:** Angular 20+ (Standalone Components)  
**Repository:** https://github.com/xman-berlin/mathe-trainer  
**Live:** https://xman-berlin.github.io/mathe-trainer/

### Projektstruktur
```
/Users/xman/projects/test/mathe-trainer/
├── src/
│   ├── app/
│   │   ├── app.ts (Root Component)
│   │   ├── app.html (Home + Router)
│   │   ├── app.css (Global + Home Styles)
│   │   ├── app.routes.ts (Router Konfiguration)
│   │   ├── components/
│   │   │   └── addition/
│   │   │       ├── addition.component.ts
│   │   │       ├── addition.component.html
│   │   │       └── addition.component.css
│   │   └── services/
│   │       └── stats.service.ts (Tägliche Statistik-Verwaltung)
│   ├── index.html
│   ├── main.ts
│   └── styles.css
├── angular.json
├── package.json
└── README.md
```

## Features

### Addition-Übungen
- Aufgaben mit Ergebnissen zwischen 0-100
- Großes Numpad (keine native Tastatur auf Mobile)
- Enter-Taste zum Bestätigen
- OK-Button auf Numpad
- Automatische nächste Aufgabe nach Feedback (600ms richtig, 1200ms falsch)

### Statistiken
- **Tägliche Tracking** via `StatsService` + localStorage
- **Per-Exercise-Type** Statistiken (z.B. Addition, Subtraktion später)
- **Home-Seite** zeigt:
  - Gesamtstatistiken (✓ / ✗ / Σ)
  - Aufgeschlüsselt pro Aufgabentyp
  - Moderne Card-Layouts mit Badges
- **Auto-Reset** täglich um Mitternacht

### Design & Responsiveness
- **Moderne Homepage** mit Statistik-Card
- **Mobile-First** Responsive Design:
  - Desktop (>1024px): Full-Width
  - Tablet (768-1024px): Adjusted Spacing
  - Phone (<768px): Stacked Layout, Large Touch Targets
  - Extra Small (<540px): Minimal Padding
- **Farb-Schema** via CSS Variablen:
  - `--bright-blue`, `--electric-violet`, `--vivid-pink`, `--orange-red`
  - Gradients: `--red-to-pink-to-purple-horizontal/vertical`
  - Grays: `--gray-900`, `--gray-700`, `--gray-400`, `--gray-100`

### Navigation
- Logo oben links = Home-Link (`routerLink="/"`)
- Menu: nur Addition (erweiterbar)
- Automatische Erkennung Exercise-Pages (versteckt Hero/Footer)

## Tech Stack

- **Angular 20** mit Standalone Components
- **TypeScript** (strict mode)
- **Signals** für reaktive State-Verwaltung (kein RxJS für UI)
- **localStorage** für Persistierung (täglich resettend)
- **CSS Custom Properties** für Theming
- **GitHub Pages** Deploy mit base href="/mathe-trainer/"

## Wichtige Commands

```bash
# Development
npm run start          # Dev-Server (Standard)
npm run start:poll     # Dev-Server mit Polling (besser für File-Watching)
npm run start:hmr      # Hot Module Replacement variant

# Build
npm run build          # Production Build
npm run watch         # Watch Mode für Entwicklung

# Testing
npm run test          # Unit Tests
npm run lint          # ESLint
```

## Development Workflow

### Lokal starten
```bash
cd /Users/xman/projects/test/mathe-trainer
npm run start:poll
# App unter http://localhost:4200
```

### Live-Reload
- Automatisch aktiv mit `npm run start:poll`
- Ändere Dateien → Browser reloaded automatisch
- Polling-Flag hilft bei File-Watching auf verschiedenen Systemen

### Building & Deployment
```bash
npm run build
# Output in /dist/mathe-trainer/
# → GitHub Pages deployt automatisch von main branch
```

## Wichtige Implementierungsdetails

### StatsService
```typescript
// Tägliche Statistiken tracken
recordResult(isCorrect: boolean, exerciseType: string = 'addition')

// Signal-basiert (reaktiv)
readonly correctCount = signal(0)
readonly incorrectCount = signal(0)
readonly totalCount = signal(0)
readonly statsByType = signal<Record<string, { correct, incorrect }>>({})
```

### Signals in Komponenten
- Immer `signal()` für State verwenden
- `computed()` für abhängige Werte
- Template: `{{ signal() }}` zum Aufrufen

### Responsive Struktur
- Base: Desktop-First Styles
- @media (max-width: 1024px) - Tablets
- @media (max-width: 768px) - Small Tablets/Large Phones
- @media (max-width: 540px) - Small Phones

## Regeln & Best Practices

1. **Änderungen immer proaktiv machen** - Nicht fragen, ob ich etwas machen soll
2. **Nur bei Aufforderung committen/pushen** - Immer fragen oder warten auf "commit and push"
3. **Signals verwenden** für alle reaktiven Werte in Komponenten
4. **Responsive Design beibehalten** - Mobile muss funktionieren
5. **CSS-Variablen nutzen** - Keine Hard-codied Farben
6. **localStorage Struktur** - Täglich Auto-Reset, byType-Struktur
7. **GitHub Pages beachten** - base href="/mathe-trainer/" in index.html
8. **Poll beim Dev-Server** - `npm run start:poll` für zuverlässiges File-Watching

## Aktuelle Status

- **Commit:** 1606306 (latest)
- **Server Status:** Läuft mit `npm run start:poll`
- **Uncommitted Changes:** Keine
- **GitHub Pages:** Aktiv unter https://xman-berlin.github.io/mathe-trainer/
- **Build Status:** ✅ Erfolgreich (Warnungen für CSS-Budget ignorierbar)

## Git Workflow

```bash
# Status checken
git status

# Änderungen committen (NUR auf Aufforderung)
git add -A
git commit -m "feat: description"
git push

# Log anschauen
git log --oneline -10
```

---

**Starte jetzt mit deinen Anfragen zur App! Alle Kontexte sind gespeichert.** 🚀
