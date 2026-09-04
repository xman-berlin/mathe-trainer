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
  ([category-home.html](../src/app/components/category-home/category-home.html)).
  Bei aktivem Plan: gleicher Slot zeigt Fortschritt + „Abbrechen“.
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

- Neuer `PracticePlanService` (Signals): `active`, `blocks[]`, `currentBlockIndex`
- API: `startFromDailyGoals()`, `recordCorrect()`, `isActive()`, `typesLocked()`, `cancel()` / `complete()`
- Persistenz v1: Session only (kein DB-Schema)
- Hooks in Exercise, Vocab, Clock, Sequence bei richtiger Antwort

## Nicht in v1

Sachaufgaben, Zeiger setzen, Hangman, Zeitrennen, Eltern-Editor, Adaptive Typwahl, Navigation sperren.

## Abgrenzung

[Adaptive Übungsauswahl](adaptive-uebungsauswahl.md) bleibt separat.

## Umsetzung

- [ ] `PracticePlanService` anlegen (Tagesziele + feste 5er-Blöcke, recordCorrect/advance)
- [ ] CategoryHome: „… oder [Übung starten]“ + aktiver Fortschritt/Abbrechen
- [ ] Mathe-/Uhrzeit-Übung: Typ-Selektor im Plan-Modus sperren/ausblenden
- [ ] `recordCorrect` in Exercise, Vocab, Clock, Sequence verdrahten
- [ ] Browser-Test: Server neu starten, Plan starten, Blöcke und Typ-Sperre prüfen
- [ ] Unit-Tests für `PracticePlanService`
- [ ] E2E Smoke: Home → Übung starten → Mathe-Fortschritt
- [ ] Vollständige Testsuite grün (`lint`, `build`, `test`, `e2e`)
