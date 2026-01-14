# GitHub Actions Setup - Checkliste

## ✅ Abgeschlossen

- [x] CI Workflow erstellt (`.github/workflows/ci.yml`)
  - [x] Node.js 18.x und 20.x Matrix-Testing
  - [x] `npm ci` für Dependencies
  - [x] `npm run lint` für Code-Qualität
  - [x] `npm run build` für Build-Validierung
  - [x] `npm test -- --watch=false --browsers=ChromeHeadless` für Unit-Tests
  - [x] Codecov-Integration (optional)

- [x] Deployment Workflow erstellt (`.github/workflows/deploy.yml`)
  - [x] Trigger auf `main` Branch
  - [x] Manuelle Trigger-Option
  - [x] `peaceiris/actions-gh-pages@v4` Integration
  - [x] Korrekter `base-href=/mathe-trainer/`
  - [x] Deployment nach GitHub Pages

- [x] Dependabot konfiguriert (`.github/dependabot.yml`)
  - [x] Wöchentliche Updates (montags 09:00)
  - [x] Angular-Packages gruppiert
  - [x] Development-Dependencies gruppiert
  - [x] Automatische Labels

## 📋 Nächste Schritte

### 1. Angular Projekt initialisieren (falls nötig)
```bash
ng new mathe-trainer --routing --style=css
```

### 2. GitHub Pages aktivieren
1. Gehe zu: https://github.com/xman-berlin/mathe-trainer/settings/pages
2. Source: Deploy from a branch
3. Branch: `gh-pages` / `root` auswählen
4. Save

### 3. Optional: Codecov einrichten
1. Besuche: https://codecov.io
2. Repository verbinden
3. Token kopieren
4. Als Secret hinzufügen:
   - Gehe zu: https://github.com/xman-berlin/mathe-trainer/settings/secrets/actions
   - New repository secret
   - Name: `CODECOV_TOKEN`
   - Value: [Dein Token]

### 4. Status Badges hinzufügen (optional)
Füge diese Zeilen am Anfang der README.md hinzu:

```markdown
[![CI](https://github.com/xman-berlin/mathe-trainer/actions/workflows/ci.yml/badge.svg)](https://github.com/xman-berlin/mathe-trainer/actions/workflows/ci.yml)
[![Deploy](https://github.com/xman-berlin/mathe-trainer/actions/workflows/deploy.yml/badge.svg)](https://github.com/xman-berlin/mathe-trainer/actions/workflows/deploy.yml)
```

### 5. Erste Commits pushen
```bash
git add .github/
git add README.md
git commit -m "feat: Add GitHub Actions workflows for CI/CD"
git push origin main
```

## 🎯 Erwartetes Verhalten

Nach dem Push:
1. **CI Workflow** läuft automatisch
   - Testet auf Node.js 18.x und 20.x
   - Führt Lint, Build und Tests aus
   - Lädt Code Coverage hoch (wenn Codecov konfiguriert)

2. **Deploy Workflow** läuft automatisch (nur bei `main`)
   - Baut die Anwendung
   - Deployed zu GitHub Pages
   - App verfügbar unter: https://xman-berlin.github.io/mathe-trainer/

3. **Dependabot** startet ab nächsten Montag
   - Erstellt PRs für Dependency-Updates
   - Gruppiert Angular und Development Dependencies

## 🔧 Anpassungen

### Build-Output-Pfad ändern
Falls Angular einen anderen Output-Pfad nutzt, prüfe `angular.json` und passe in `deploy.yml` an:
```yaml
publish_dir: ./dist/[dein-pfad]/browser
```

### Custom Domain
Falls du eine Custom Domain nutzt, ändere in `deploy.yml`:
```yaml
cname: deine-domain.com  # statt: cname: false
```

Und im Build-Befehl:
```yaml
run: npm run build -- --base-href=/  # statt: --base-href=/mathe-trainer/
```

## 📚 Dokumentation

- Ausführliche Infos: `.github/WORKFLOWS_SETUP.md`
- Workflow-Dateien: `.github/workflows/`
- Dependabot-Config: `.github/dependabot.yml`

## ✨ Fertig!

Alle GitHub Actions sind eingerichtet und bereit. Pushe die Änderungen und beobachte die ersten Workflow-Runs unter:
https://github.com/xman-berlin/mathe-trainer/actions

