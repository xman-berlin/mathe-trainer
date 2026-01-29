# Schlaufuchs 🦊

Eine interaktive Lern-App für Mathematik und Uhrzeiten lernen, entwickelt mit Angular und TypeScript.

## 📖 Über das Projekt

Schlaufuchs ist eine webbasierte Anwendung, die Grundschülern hilft, ihre mathematischen Fähigkeiten zu verbessern und das Ablesen der Uhr zu lernen. Das Projekt wurde mit [Angular CLI](https://github.com/angular/angular-cli) version 20.3.4 erstellt und nutzt moderne Web-Technologien.

## 🚀 Quick Start

### Voraussetzungen

- Node.js (Version 18.x oder 20.x)
- npm (kommt mit Node.js)
- Angular CLI: `npm install -g @angular/cli`

### Installation

```bash
# Repository klonen
git clone https://github.com/xman-berlin/mathe-trainer.git
cd schlaufuchs

# Dependencies installieren
npm install

# Development Server starten
ng serve
```

Die Anwendung ist dann unter `http://localhost:4200/` erreichbar.

## 💻 Entwicklung

### Development Server

```bash
ng serve
```

Der Server startet auf `http://localhost:4200/` und lädt automatisch neu bei Dateiänderungen.

### Code Scaffolding

Neue Komponente erstellen:
```bash
ng generate component components/component-name
```

Neue Service erstellen:
```bash
ng generate service services/service-name
```

Alle verfügbaren Schematics anzeigen:
```bash
ng generate --help
```

### Build

Production Build erstellen:
```bash
ng build
```

Die Build-Artefakte werden im `dist/` Verzeichnis gespeichert.

### Tests

Unit Tests ausführen:
```bash
ng test
```

Tests mit Code Coverage:
```bash
ng test --code-coverage
```

### Linting

Code-Qualität prüfen:
```bash
ng lint
```

## 📁 Projekt-Struktur

```
schlaufuchs/
├── src/
│   ├── app/
│   │   ├── components/     # UI-Komponenten
│   │   ├── services/       # Business-Logik und Datendienste
│   │   ├── utils/          # Hilfsfunktionen
│   │   ├── app.ts          # Hauptkomponente
│   │   ├── app.config.ts   # App-Konfiguration
│   │   └── app.routes.ts   # Routing-Konfiguration
│   ├── index.html
│   ├── main.ts
│   └── styles.css
├── public/                 # Statische Assets
├── .github/
│   └── workflows/          # CI/CD Workflows
└── angular.json            # Angular-Konfiguration
```

## 🚀 GitHub Actions & CI/CD

Dieses Projekt nutzt GitHub Actions für Continuous Integration und Deployment:

### CI Workflow
- **Trigger**: Bei jedem Push oder Pull Request auf `main` oder `develop`
- **Node.js Versionen**: 18.x und 20.x
- **Schritte**:
  - Installation der Dependencies (`npm ci`)
  - Linting (`npm run lint`)
  - Build (`npm run build`)
  - Unit Tests (`npm test -- --watch=false --browsers=ChromeHeadless`)
  - Code Coverage Upload zu Codecov (optional)

### Deployment Workflow
- **Trigger**: Bei jedem Push auf `main` (oder manuell)
- **Ziel**: GitHub Pages
- **Features**:
  - Automatischer Build mit korrektem `base-href`
  - Deployment via `peaceiris/actions-gh-pages`
  - Die App ist verfügbar unter: `https://xman-berlin.github.io/schlaufuchs/`

### Dependabot
- **Aktualisierung**: Wöchentlich montags um 09:00 Uhr
- **Gruppierung**: Angular-Packages und Development-Dependencies werden gruppiert
- **Labels**: Automatisches Hinzufügen von `dependencies` Label

## 🛠️ Technologie-Stack

- **Framework**: Angular 20.3.4 (zoneless)
- **Sprache**: TypeScript
- **Styling**: CSS
- **Testing**: Karma + Jasmine
- **Build-Tool**: Angular CLI
- **CI/CD**: GitHub Actions
- **Hosting**: GitHub Pages

## 📚 Ressourcen

- [Angular Dokumentation](https://angular.dev/)
- [TypeScript Dokumentation](https://www.typescriptlang.org/)
- [Angular CLI Command Reference](https://angular.dev/tools/cli)
- [GitHub Actions Workflows](.github/workflows/)

## 🤝 Beitragen

Contributions sind willkommen! Bitte erstelle einen Pull Request oder öffne ein Issue für Verbesserungsvorschläge.

## 📝 Lizenz

Dieses Projekt ist für Bildungszwecke erstellt.
