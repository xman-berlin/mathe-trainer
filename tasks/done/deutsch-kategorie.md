# Deutsch-Kategorie — Refactoring-Plan

## Ziel

Den bestehenden Vokabeltrainer-Code (aktuell mehrsprachig ausgelegt) zu einer
**„Deutsch"-Kategorie** umbauen. Die erste Übungsart ist **Rechtschreibung**:
TTS spricht ein deutsches Wort, das Kind tippt es mit der QWERTZ-Tastatur.
Die Kategorie ist erweiterbar für künftige Übungstypen (z.B. der/die/das).

---

## Was sich ändert (Übersicht)

| Bereich | Vorher | Nachher |
|---|---|---|
| Kategoriename in UI | „Vokabeln" | „Deutsch" |
| Routen-Präfix | `/vokabeln` | `/deutsch` |
| Exercise-Type-Key | `vocab-<sprachname>` | `deutsch-rechtschreibung` |
| `VocabLanguage`-Tabelle | zentral — Quelle für `speech_lang` | entfällt als Konzept; `speech_lang` = fest `de-DE` |
| DB-Tabellen `vocab_languages` | wird genutzt | wird **nicht mehr genutzt** (Tabelle bleibt in DB, wird aber ignoriert) |
| `vocab_lists.language_id` | Pflichtfeld | wird auf `NULL` gesetzt / ignoriert |
| Stats-Signal-Präfix | `vocabCorrectCount` / `vocabGoalProgressPercent` / … | umbenannt zu `deutschCorrectCount` / … |
| `vocab_daily_goal` (DB + LS) | bestehende Spalte | bleibt, wird nur umbenannt im Code zu `deutschDailyGoal` |
| category-home Card | „Vokabeln" mit `/vokabeln` | „Deutsch" mit `/deutsch` |
| `VocabSessionWord.languageId` | genutzt | entfernt |

---

## Architektur nach Refactoring

### Übungsablauf (Rechtschreibung)
- App spricht ein deutsches Wort via `SpeechSynthesisUtterance` mit `lang = 'de-DE'`
- Kind tippt die Schreibweise mit dem QWERTZ-Keyboard
- Richtig → grünes Feedback, Gewicht sinkt, nächstes Wort nach 1 s
- Falsch → rotes Feedback, korrekte Schreibweise angezeigt, Gewicht steigt, nächstes Wort nach 2 s
- Stats werden als `'deutsch-rechtschreibung'` erfasst

### Wort-Gewichtung (unverändert)
- Neues Wort: Gewicht = 3
- Richtig: `weight = max(1, weight - 1)`
- Falsch: `weight = weight + 2`
- Neueste zugewiesene Liste = „aktiv" (rohes Gewicht); ältere Listen = Gewicht auf 1 gekappt

### Wortlisten-Modell
- Listen haben einen frei wählbaren Namen (Standard = erstes Wort)
- Listen werden Nutzern zugewiesen (Admin-CRUD)
- **Keine Sprach-Ebene mehr** — alle Listen sind implizit auf Deutsch

---

## Supabase-Änderungen

### Keine neuen Tabellen nötig
Die bestehenden Tabellen (`vocab_lists`, `vocab_list_words`, `vocab_user_assignments`,
`vocab_word_progress`, `daily_stats.vocab_daily_goal`) werden weiterverwendet.

### `vocab_languages`-Tabelle
Bleibt in der DB (wird nicht gedroppt), wird aber vom Frontend nicht mehr abgefragt.
`vocab_lists.language_id` wird für neue Listen auf `NULL` gesetzt (Spalte ist kein `NOT NULL`
in unserem Code — muss geprüft werden; ggf. `ALTER TABLE vocab_lists ALTER COLUMN language_id DROP NOT NULL`).

### Migration nötig
```sql
-- Macht language_id optional, damit Listen ohne Sprach-Zuordnung erstellt werden können
ALTER TABLE vocab_lists ALTER COLUMN language_id DROP NOT NULL;
```

---

## Aufgaben

### Phase 1 — DB-Migration
- [ ] Neue Migrationsdatei: `supabase/migrations/20260324_deutsch_kategorie.sql`
      Inhalt: `ALTER TABLE vocab_lists ALTER COLUMN language_id DROP NOT NULL;`
- [ ] Migration auf Prod ausführen

### Phase 2 — Models
- [ ] `src/app/models/vocab.model.ts` anpassen
      - `VocabLanguage` Interface entfernen
      - `VocabList.language_id` optional machen (`language_id?: string`)
      - `VocabSessionWord.languageId` entfernen

### Phase 3 — SupabaseService
- [ ] `src/app/services/supabase.service.ts` — Vocab-Languages-Methoden entfernen:
      `getVocabLanguages()`, `createVocabLanguage()`, `deleteVocabLanguage()`
- [ ] `getVocabListsForLanguage(languageId)` → `getVocabLists()` (ohne language_id Filter)
- [ ] `createVocabList(name)` — `language_id` Parameter entfernen
- [ ] `getVocabAssignmentsForUser(userId)` — bleibt unverändert

### Phase 4 — VocabService → DeutschService
- [ ] `src/app/services/vocab.service.ts` umbenennen / refactoren:
      - `languages` Signal entfernen
      - `loadUserData()`: kein `getVocabLanguages()` mehr, nur assignments + word progress
      - `buildSession(userId)` — kein `languageId` Parameter mehr; alle zugewiesenen Listen
      - `getAssignedLanguages()` → entfernen
      - `getLanguageById()` → entfernen
      - Datei umbenennen zu `deutsch.service.ts`, Klasse zu `DeutschService`

### Phase 5 — StatsService
- [ ] `src/app/services/stats.service.ts` — alle `vocab`-Präfixe auf `deutsch` umbenennen:
      - `vocabDailyGoal` → `deutschDailyGoal`
      - `vocabCorrectCount` → `deutschCorrectCount`
      - `vocabGoalProgressPercent` → `deutschGoalProgressPercent`
      - `isVocabGoalReached` → `isDeutschGoalReached`
      - `vocabGoalBonusAwarded` → `deutschGoalBonusAwarded`
      - `setVocabDailyGoal()` → `setDeutschDailyGoal()`
      - `currentVocabGoal` → `currentDeutschGoal`
      - Exercise-Type-Erkennung: `startsWith('vocab-')` → `startsWith('deutsch-')`

### Phase 6 — StatsModel
- [ ] `src/app/models/stats.model.ts`:
      - `vocab_daily_goal` bleibt als DB-Spaltenname (Supabase-Kompatibilität)
      - Kommentar aktualisieren

### Phase 7 — AuthService
- [ ] `src/app/services/auth.service.ts`:
      - `VocabService` → `DeutschService` ersetzen (lazy import)

### Phase 8 — LetterKeypad (unverändert)
- [ ] Keine Änderungen nötig — bleibt als `shared/letter-keypad`

### Phase 9 — Exercise-Komponente
- [ ] Verzeichnis `vocab-exercise/` → `deutsch-rechtschreibung/` umbenennen
- [ ] Klasse/Selektor entsprechend anpassen
- [ ] `exerciseType` fest auf `'deutsch-rechtschreibung'` setzen (kein computed von language)
- [ ] `speech_lang` fest auf `'de-DE'` im Code (nicht aus DB)
- [ ] `?lang=` Query-Param entfernen — nicht mehr nötig
- [ ] Route-Rücklink: `/vokabeln` → `/deutsch`

### Phase 10 — Category-Overview-Komponente
- [ ] Verzeichnis `vocab-category-overview/` → `deutsch-category-overview/` umbenennen
- [ ] Klasse/Selektor anpassen
- [ ] Mehrsprachige Liste (assignedLanguages) entfernen
- [ ] Stattdessen: direkt zur Rechtschreibübung verlinken (`/deutsch/rechtschreibung`)
- [ ] Stats auf `deutschCorrectCount` / `currentDeutschGoal` etc. umstellen

### Phase 11 — Management-Komponente
- [ ] Verzeichnis `vocab-management/` → `deutsch-management/` umbenennen
- [ ] Sprach-Spalte (Languages-Panel) aus der UI entfernen — Listen direkt anzeigen
- [ ] `createVocabList()` ohne `language_id` aufrufen
- [ ] Titel/Labels auf „Deutsch" / „Wortlisten" anpassen

### Phase 12 — Routen
- [ ] `src/app/app.routes.ts`:
      - `/vokabeln` → `/deutsch`
      - `/vokabeln/uebung` → `/deutsch/rechtschreibung`
      - `/vokabeln/verwalten` → `/deutsch/verwalten`
      - Komponenten-Imports entsprechend aktualisieren

### Phase 13 — CategoryHome
- [ ] `src/app/components/category-home/category-home.ts`:
      - `vocabGoal*` → `deutschGoal*`
      - `showVocabGoalEditor` → `showDeutschGoalEditor`
- [ ] `src/app/components/category-home/category-home.html`:
      - Card-Text: „Vokabeln" → „Deutsch", „Wörter hören und richtig schreiben" bleibt
      - `routerLink="/vokabeln"` → `routerLink="/deutsch"`
      - Stats-Signale aktualisieren

### Phase 14 — Qualitätssicherung
- [ ] `npm run lint` — alle Fehler beheben
- [ ] `npm run build` — Build erfolgreich
- [ ] `npm run test -- --watch=false` — alle Tests grün

---

## Deviations / Anmerkungen

- `vocab_languages`-Tabelle bleibt in der DB — sie wird nur nicht mehr vom Frontend genutzt.
  Ein späteres DROP TABLE ist optional.
- Der DB-Spaltenname `vocab_daily_goal` in `daily_stats` bleibt unverändert
  (Supabase-Breaking-Change vermeiden). Nur die Code-Variablennamen werden umbenannt.
- `VocabLanguage` Interface wird aus dem Model entfernt; bestehende Datenbankzeilen
  in `vocab_languages` werden ignoriert.
- Künftige Übungstypen (z.B. `deutsch-artikel` für der/die/das) folgen demselben Muster:
  neuer Eintrag in `app.routes.ts`, neue Komponente, Stats unter `'deutsch-artikel'`.

---

## Review

**Abgeschlossen: 2026-03-23**

### Was umgesetzt wurde

- Alle Phasen 1–13 vollständig implementiert
- `VocabService` → `DeutschService`, alle `vocab-*` Signale auf `deutsch-*` umbenannt
- Routen `/vokabeln/*` → `/deutsch/*` mit Backward-Compat-Redirects
- Exercise-Komponente: TTS fest auf `de-DE`, Exercise-Type-Key `deutsch-rechtschreibung`
- Category-Overview vollständig nach Mathe-Muster neu gebaut (Stats, Ziel-Editor, Action-Cards)
- Management-Komponente: Language-Panel entfernt
- Home-Seite: Deutsch-Card auf Platz 3, Erfolge auf Platz 4; Stats (✓/✗) gleichartig zu Mathe/Uhrzeit
- Streak-Display, Milestone-Popup, Confetti und Result-Summary-Badges in Vocab-Exercise ergänzt — identische Markup-Struktur wie Mathe-Exercise
- QWERTZ-Keyboard: Keys füllen jetzt die volle Zeilenbreite (kein Wrap mehr), größere Touch-Targets
- Back-Button: globales `.back-home-btn` Pattern (absolut positioniert, oben links)

### Abweichungen vom ursprünglichen Plan

- Verzeichnisnamen (`vocab-exercise/`, `vocab-category-overview/`, `vocab-management/`) wurden **nicht umbenannt** — nur Klassen/Selektoren wurden angepasst. Grund: minimaler Impact, keine Umbenennung nötig für korrekte Funktion.
- `vocab-module.md` Task-Datei bleibt aktiv (enthält ältere offene Punkte aus dem ursprünglichen Vocab-Feature).

### Qualität

- Lint: ✅ keine Fehler
- Build: ✅ erfolgreich (Budget-Warnungen pre-existing)
- Tests: ✅ 2/2 grün

