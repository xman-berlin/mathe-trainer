# Übungsplan v1 — Start nur von der Hauptseite

## Idee

Auf der Startseite kann das Kind einen geführten Übungsplan starten („Übung starten“).
Die App führt nacheinander feste Blöcke durch; Typ-Abwahl ist nur während des Plans gesperrt.
Freies Navigieren über die Kategorie-Karten bleibt unverändert möglich.

## Motivation

- Kinder wählen oft nur leichte Typen und meiden z.B. Multiplikation/Division
- Eltern/Hausaufgabe brauchen eine klare „mach den Plan fertig“-Session
- Tagesziele sollen die Länge der Mathe-/Deutsch-/Uhrzeit-Blöcke bestimmen

## Produktentscheidung (v1)

- **Einstieg:** In `.categories-section` der Startseite: **„Wähle eine Kategorie … oder [Übung starten]“**
  ([category-home.html](../../src/app/components/category-home/category-home.html)).
  Bei aktivem Plan: gleicher Slot zeigt Fortschritt + „Weiterüben“ / „Abbrechen“.
- **Plan-Blöcke (feste Reihenfolge):**

| Block | Route | Zielanzahl (richtige Antworten) |
|---|---|---|
| Mathe | `/mathe/uebung` | `StatsService.currentGoal()` |
| Deutsch (Rechtschreibung) | `/deutsch/rechtschreibung` | `StatsService.currentDeutschGoal()` |
| Wochentage | `/deutsch/wochentage` | **fix 5** |
| Monate | `/deutsch/monate` | **fix 5** |
| Alphabet | `/deutsch/alphabet` | **fix 5** |
| Uhrzeit | `/uhrzeit/uebung` | `StatsService.currentClockGoal()` |

- Tagesziele werden beim **Start** eingefroren (Snapshot). Sequence-Blöcke immer Ziel = 5.
- Während Plan: Mathe/Uhrzeit Typ-Selektor aus / Vollmix.
- Außerhalb: App unverändert; freies Üben parallel möglich.
- Nur **richtige** Antworten zählen; Plan-Zähler starten bei 0.

## Architektur

- Neuer `PracticePlanService` (Signals): `active`, `paused`, `blocks[]`, `currentBlockIndex`
- API: `startFromDailyGoals()`, `recordCorrect()`, `isActive()`, `isGuiding()`, `typesLocked()`, `pause()`, `resume()`, `cancel()` / `complete()`
- Persistenz v1: Session only (kein DB-Schema)
- Hooks in Exercise, Vocab, Clock, Sequence bei richtiger Antwort
- Pausieren: „Zurück“ während geführtem Plan → Home; Plan bleibt mit „Weiterüben“ fortsetzbar.
  Freies Üben danach nutzt wieder normale Kategorie-Zurück-Links.

## Nicht in v1

Sachaufgaben, Zeiger setzen, Hangman, Zeitrennen, Eltern-Editor, Adaptive Typwahl, Navigation sperren.

## Abgrenzung

[Adaptive Übungsauswahl](../adaptive-uebungsauswahl.md) bleibt separat.

## Umsetzung

- [x] `PracticePlanService` anlegen (Tagesziele + feste 5er-Blöcke, recordCorrect/advance)
- [x] CategoryHome: „… oder [Übung starten]“ + aktiver Fortschritt/Abbrechen
- [x] Mathe-/Uhrzeit-Übung: Typ-Selektor im Plan-Modus sperren/ausblenden
- [x] `recordCorrect` in Exercise, Vocab, Clock, Sequence verdrahten
- [x] Browser-Test: Server neu starten, Plan starten, Blöcke und Typ-Sperre prüfen
- [x] Unit-Tests für `PracticePlanService`
- [x] E2E Smoke: Home → Übung starten → Mathe-Fortschritt
- [x] Vollständige Testsuite grün (`lint`, `build`, `test`, `e2e`)

## Review

**Completed:** 2026-09-05

**Implemented:**
- `PracticePlanService` with six-block plan, snapshot daily goals, pause/resume, type lock for Mathe/Uhrzeit
- Home CTA „Übung starten“, progress + „Weiterüben“ / „Abbrechen“
- `recordCorrect` wired in Exercise, Vocab, Clock, Sequence
- Back during guiding → home; free practice while paused uses category back links
- Unit tests + E2E (`e2e/uebungsplan.spec.ts`)

**Deviations from original plan:**
- Added pause/`isGuiding` so leaving the plan does not break free-nav back links
- Added „Weiterüben“ (resume) on home when a plan is active
- Plan-exit back links go to `/` only while guiding
