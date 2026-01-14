# mathe-trainer
Mathertrainer für die Grundschule

## 🚀 GitHub Actions

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
  - Die App ist verfügbar unter: `https://xman-berlin.github.io/mathe-trainer/`

### Dependabot
- **Aktualisierung**: Wöchentlich montags um 09:00 Uhr
- **Gruppierung**: Angular-Packages und Development-Dependencies werden gruppiert
- **Labels**: Automatisches Hinzufügen von `dependencies` Label

## 📝 Setup-Hinweise

### Codecov (Optional)
Falls Code Coverage hochgeladen werden soll:
1. Account auf [codecov.io](https://codecov.io) erstellen
2. Repository hinzufügen
3. `CODECOV_TOKEN` als Secret in GitHub Repository Settings hinterlegen

### GitHub Pages aktivieren
1. Gehe zu Repository Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: `gh-pages` / `root`

### Lokale Entwicklung
```bash
# Dependencies installieren
npm install

# Development Server starten
npm start

# Tests ausführen
npm test

# Linting
npm run lint

# Production Build
npm run build
```

