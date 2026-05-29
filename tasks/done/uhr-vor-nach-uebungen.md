# Uhrzeit: Vor/Nach-Übungen (fiveMinAfter / fiveMinBefore / fiveMinHalf)

## Ziel

Gezielte Übungen für die schwierigen "vor/nach"-Zeiten bei der Uhrzeit:
- `fiveMinAfter` — 5/10/15/20/25 Minuten **nach** voller Stunde
- `fiveMinBefore` — 5/10/15/20/25 Minuten **vor** voller Stunde (linke Uhr-Hälfte)
- `fiveMinHalf` — 5/10 Minuten **vor/nach** halber Stunde

Beim Zeiger-Setzen: Stundenzeiger wird automatisch korrekt positioniert und ist nicht draggable.
Nur der Minutenzeiger muss gesetzt werden.

## Entscheidungen

- Neue Typen werden in die **bestehende** Zeiger-Setzen-Übung integriert (keine neue Route/Card)
- `fiveMinHalf` erzeugt Minuten: 20, 25, 35, 40 (= 10/5 vor/nach halb)
- Stundenzeiger: auto-gesetzt, kein Drag-Handle, wird **nicht** in der Validierung geprüft
- Snap der interaktiven Uhr bleibt bei 5° (= 1-Minuten-Schritte sind bereits möglich bei 1°-Snap laut App, aber 5° reicht für 5-Min-Schritte)
- Deutsche Ausdrücke: "zehn nach halb drei", "fünf vor halb sieben", "zwanzig nach zwei" etc.
- Stats-Keys: `clock-setClock-fiveMinAfter`, `clock-setClock-fiveMinBefore`, `clock-setClock-fiveMinHalf`
- Unlock-Schwelle: 100 Versuche (wie bestehende Typen)

## Plan

### 1. `ClockExerciseType` erweitern
**Datei:** `src/app/services/clock.ts` und `src/app/components/set-clock-exercise/set-clock-exercise.ts`

- [ ] Typ-Union erweitern: `'full' | 'half' | 'quarter' | 'fiveMin' | 'fiveMinAfter' | 'fiveMinBefore' | 'fiveMinHalf'`
- [ ] Labels und Icons für neue Typen ergänzen
- [ ] Duplikat-Typ in `set-clock-exercise.ts` ebenfalls erweitern (oder Import aus Service einführen)

### 2. Problem-Generator erweitern
**Datei:** `src/app/components/set-clock-exercise/set-clock-exercise.ts` → `generateProblem()`

- [ ] `fiveMinAfter`: minutes ∈ {5, 10, 15, 20, 25}, hours random 0–11
- [ ] `fiveMinBefore`: minutes ∈ {35, 40, 45, 50, 55}, hours random 0–11
- [ ] `fiveMinHalf`: minutes ∈ {20, 25, 35, 40}, hours random 0–11

### 3. Deutsche Ausdrücke erweitern
**Datei:** `src/app/components/set-clock-exercise/set-clock-exercise.ts` → `generateGermanExpression()`

Aktuell fehlen korrekte Ausdrücke für:
- 20 min → "zwanzig nach X"
- 25 min → "fünf vor halb X+1"
- 35 min → "fünf nach halb X+1"
- 40 min → "zwanzig vor X+1"
- 55 min → "fünf vor X+1"

Bestehende `minuteWords`-Logik hat Bug bei 25/35 min (beide → `'fünf'`, aber ohne `halb`-Qualifikator).
Diesen Bug mit beheben.

### 4. Interaktive Uhr: Stundenzeiger auto-setzen
**Datei:** `src/app/components/interactive-clock-display/interactive-clock-display.ts` und `.html`

- [ ] Neuen Input `lockHourHand = input<boolean>(false)` hinzufügen
- [ ] Neuen Input `initialHourAngle = input<number>(0)` hinzufügen
- [ ] Wenn `lockHourHand = true`:
  - Stundenzeiger auf `initialHourAngle` fixieren (kein Drag-Handle rendern)
  - `startDrag('hour', ...)` ignorieren / kein `mousedown`/`touchstart` auf Stundenzeiger
- [ ] `currentHourAngle` mit `initialHourAngle` initialisieren wenn `lockHourHand = true`

### 5. SetClockExercise: Stundenzeiger auto-setzen für neue Typen
**Datei:** `src/app/components/set-clock-exercise/set-clock-exercise.ts`

- [ ] Computed `lockHourHand`: true wenn aktueller Problemtyp ∈ neuen Typen
- [ ] `correctHourAngle` als Input an `InteractiveClockDisplayComponent` übergeben
- [ ] Validierung für neue Typen: nur `isMinuteCorrect` prüfen (Stundenzeiger bereits korrekt)

### 6. SetClockExercise: Typ-Auswahl erweitern
**Datei:** `src/app/components/set-clock-exercise/set-clock-exercise.html` und `.ts`

- [ ] `exerciseTypes`-Array um neue Typen erweitern
- [ ] `lockedTypes` computed: neue Typen ebenfalls auf 100-Versuche-Schwelle prüfen
- [ ] Neue Typen erst freischalten wenn `fiveMin` freigeschaltet ist (Reihenfolge beachten)

### 7. Validierung anpassen
**Datei:** `src/app/components/set-clock-exercise/set-clock-exercise.ts` → `submitAnswer()`

- [ ] Hilfsmethode `isNewType(type)` oder Computed
- [ ] Wenn neuer Typ: `correct = isMinuteCorrect` (Stundenzeiger ignorieren)
- [ ] Toleranz Minutenzeiger bleibt ±5°

### 8. Tests aktualisieren
- [ ] `set-clock-exercise.component.spec.ts`: neue Typen in Snapshot-/Unit-Tests ergänzen
- [ ] `interactive-clock-display.component.spec.ts`: `lockHourHand`-Input testen

## Verifikation

```
npm run lint
npm run build
npm run test -- --watch=false --browsers=ChromeHeadless
```

## Offene Fragen / spätere Verbesserungen

- Soll `fiveMinHalf` auch im "Uhrzeit ablesen"-Modus (`ClockExerciseComponent`) verfügbar sein?
- Toleranz: Reichen ±5° für 5-Min-Schritte, oder soll sie auf ±6° erhöht werden?

## Review

**Abgeschlossen:** 2026-05-29

### Was wurde implementiert

- 3 neue Übungstypen in Zeiger-Setzen: `fiveMinAfter`, `fiveMinBefore`, `fiveMinHalf`
- Stundenzeiger wird bei neuen Typen automatisch positioniert und kann nicht gezogen werden
- Visueller Hinweis wechselt zwischen "Ziehe die Zeiger!" und "Setze den Minutenzeiger!"
- Typ-Auswahl wird in localStorage gespeichert und beim nächsten Besuch wiederhergestellt
- Bug behoben: Minutenzeiger wurde bei neuem Problem mit gleichen Minuten nicht zurückgesetzt (`ngOnChanges`)
- Bug behoben: Doppelter Badge-Insert beim App-Start verursachte 409-Fehler (upsert mit `ignoreDuplicates`)
- Bug behoben: `precision-streak` berechnete Fortschritt falsch (summierte Tages-Gesamt statt Streak)
- 3 neue Badges: `vor-nach-beginner` (25), `vor-nach-expert` (100), `clock-all-types` (alle 7 je ≥100)
- Zeitrennen-Badges und UI-Abschnitt ausgeblendet (Feature deaktiviert, Code erhalten)
- Alle `clockTypes`-Listen in stats, category-home, category-overview, achievements aktualisiert
- Neue Typen default aktiv, zählen bei Tageszielen und Erfolgen mit

### Abweichungen vom Plan

- `fiveMinHalf` enthält Minuten 20/25/35/40 wie geplant
- Keine neue Route — alles in bestehende Zeiger-Setzen-Übung integriert wie geplant
- Zusätzlich: persistente Typ-Auswahl (nicht ursprünglich geplant, auf Nutzerwunsch ergänzt)
- Zusätzlich: Sperr-Logik umgekehrt (gesperrt = gemeistert ≥100, nicht "noch nicht freigeschaltet")

### Qualität

- 658 Unit-Tests ✓
- 81 E2E-Tests ✓
- Lint + Build ✓
- CI grün ✓
