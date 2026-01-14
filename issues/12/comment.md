## GitHub Actions Workflow-Dateien

Hier sind die vollständigen Workflow-Dateien für dieses Projekt:

### 1. CI-Workflow `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Build
        run: npm run build -- --configuration=production
      
      - name: Test
        run: npm test -- --watch=false --browsers=ChromeHeadless --code-coverage
```

### 2. Deployment zu GitHub Pages `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build -- --output-path=dist --configuration=production --base-href=/mathe-trainer/
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 3. Dependabot `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "automated"
```

### Setup-Schritte:

1. **Erstelle die Ordnerstruktur:**
   ```bash
   mkdir -p .github/workflows
   ```

2. **Erstelle die Dateien** und kopiere die obigen Inhalte

3. **GitHub Pages aktivieren:**
   - Gehe zu Repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` / `root`

4. **Commit und Push:**
   ```bash
   git add .github/
   git commit -m "Add GitHub Actions workflows"
   git push
   ```

Die Workflows werden automatisch bei deinem nächsten Push ausgeführt! 🚀