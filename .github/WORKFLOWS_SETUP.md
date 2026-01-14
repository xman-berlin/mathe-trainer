# GitHub Actions Setup - Mathe-Trainer

## ✅ Erstellte Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)
**Funktionen:**
- Automatischer Build, Test und Lint bei jedem Push/PR
- Matrix-Testing mit Node.js 18.x und 20.x
- Code Coverage mit Codecov-Integration
- ChromeHeadless für Tests

**Trigger:**
- Push auf `main` oder `develop`
- Pull Requests auf `main` oder `develop`

### 2. Deployment Workflow (`.github/workflows/deploy.yml`)
**Funktionen:**
- Automatisches Deployment nach GitHub Pages
- Nutzt `peaceiris/actions-gh-pages@v4`
- Korrekter `base-href` für Angular: `/mathe-trainer/`
- Manuelle Trigger-Option via `workflow_dispatch`

**Trigger:**
- Push auf `main`
- Manuell über GitHub UI

### 3. Dependabot (`.github/dependabot.yml`)
**Funktionen:**
- Wöchentliche Dependency-Updates (montags 09:00)
- Gruppierung von Angular-Packages
- Gruppierung von Development-Dependencies
- Automatische Labels und Commit-Messages

## 🔧 Nächste Schritte

1. **Angular Projekt initialisieren** (falls noch nicht geschehen):
   ```bash
   ng new mathe-trainer --routing --style=css
   ```

2. **Überprüfen Sie die Build-Output-Path** in `angular.json`:
   - Standardmäßig: `dist/mathe-trainer/browser`
   - Falls abweichend, passen Sie in `deploy.yml` die Zeile `publish_dir` an

3. **GitHub Pages aktivieren**:
   - Settings → Pages → Source: `gh-pages` branch

4. **Optional - Codecov einrichten**:
   - Account auf codecov.io erstellen
   - Token als `CODECOV_TOKEN` Secret hinzufügen

5. **Repository Secrets prüfen**:
   - `GITHUB_TOKEN` wird automatisch bereitgestellt
   - `CODECOV_TOKEN` nur bei Nutzung von Codecov nötig

## 📊 Status Badges

Fügen Sie diese Badges zu Ihrer README.md hinzu:

```markdown
[![CI](https://github.com/xman-berlin/mathe-trainer/actions/workflows/ci.yml/badge.svg)](https://github.com/xman-berlin/mathe-trainer/actions/workflows/ci.yml)
[![Deploy](https://github.com/xman-berlin/mathe-trainer/actions/workflows/deploy.yml/badge.svg)](https://github.com/xman-berlin/mathe-trainer/actions/workflows/deploy.yml)
```

## 🔍 Troubleshooting

### Build-Pfad anpassen
Falls der Build-Output-Pfad anders ist, prüfen Sie `angular.json`:
```json
"architect": {
  "build": {
    "options": {
      "outputPath": "dist/mathe-trainer/browser"  // Dieser Pfad
    }
  }
}
```

### Base-href anpassen
Der `base-href` muss dem Repository-Namen entsprechen:
```bash
npm run build -- --base-href=/mathe-trainer/
```

Falls Sie eine Custom Domain nutzen:
```bash
npm run build -- --base-href=/
```

## 📚 Referenzen

- [Angular Continuous Integration](https://angular.io/guide/testing#continuous-integration)
- [GitHub Actions für Angular](https://docs.github.com/en/actions)
- [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)

