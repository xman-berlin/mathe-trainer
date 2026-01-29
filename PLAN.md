# Implementierungsplan: Schlaufuchs 🦊

## Übersicht
Umbau von "Mathe-Trainer" zu "Schlaufuchs" - Eine Lern-App für Mathematik und Uhrzeit lernen.

---

## App-Struktur

### Route-Hierarchie
```
/                           → Startseite (Kategorieauswahl)
│
├─ /mathe                   → Mathe-Übersicht
│  ├─ /mathe/uebung         → Mathe Übung
│  ├─ /mathe/zeitrennen     → Mathe Zeitrennen
│  └─ /mathe/erfolge        → Mathe Erfolge
│
└─ /uhrzeit                 → Uhrzeit-Übersicht
   ├─ /uhrzeit/uebung       → Uhrzeit Übung
   ├─ /uhrzeit/zeitrennen   → Uhrzeit Zeitrennen
   └─ /uhrzeit/erfolge      → Uhrzeit Erfolge
```

### Statistik-Konzept
- **Homepage**: Beide Statistiken nebeneinander (Mathe | Uhrzeit)
- **Tagesziel**: Getrennt pro Kategorie
- **Erfolge**: Getrennt pro Kategorie
- **localStorage**: Separate Keys für Mathe/Uhrzeit

---

## Uhrzeit-Übungen: Spezifikation

### Übungstyp 1: Volle Stunden
- **Anzeige**: Analoge Uhr + Text "Es ist Vormittag ☀️" / "Es ist Nachmittag 🌙"
- **Zeiger**: Genau auf 1-12
- **Eingabe**: 24h Format (z.B. 3:00 → 03:00 oder 15:00)
- **Beispiele**:
  - Vormittag, Zeiger auf 9 → Antwort: 09:00
  - Nachmittag, Zeiger auf 3 → Antwort: 15:00

### Übungstyp 2: Halbe Stunden
- **Anzeige**: Analoge Uhr + Tageszeit-Kontext
- **Zeiger**: Minutenzeiger auf 6 (30 Minuten)
- **Eingabe**: 24h Format (z.B. 3:30 → 03:30 oder 15:30)
- **Beispiele**:
  - Vormittag, Zeiger auf 10:30 → Antwort: 10:30
  - Nachmittag, Zeiger auf 4:30 → Antwort: 16:30

### Übungstyp 3: Viertelstunden
- **Anzeige**: Analoge Uhr + Tageszeit-Kontext
- **Zeiger**: Minutenzeiger auf 3 oder 9 (15/45 Minuten)
- **Eingabe**: 24h Format (z.B. 3:15 → 03:15 oder 15:15)
- **Beispiele**:
  - Vormittag, Zeiger auf 7:15 → Antwort: 07:15
  - Nachmittag, Zeiger auf 2:45 → Antwort: 14:45

### Eingabe-Validierung
- Format: HH:MM (strikt 24h)
- Akzeptiert: "09:00", "15:30", "03:15"
- Reject: "9:00" (fehlendes 0), "3:30 PM" (12h Format)

### Clock Component Design
```
┌─────────────────────────┐
│   Es ist Nachmittag 🌙  │
│                         │
│        ╱╲               │  ← Analoge Uhr (SVG)
│       ╱  ╲              │     Stundenzeiger
│      │    ●             │     Minutenzeiger
│       ╲  ╱              │
│        ╲╱               │
│                         │
│   Wie spät ist es?      │
│   [__:__] (24h)         │
│   Eingabe: HH:MM        │
└─────────────────────────┘
```

---

## Medaillen-System für Uhrzeit

Kumulative Erfolge (wie bei Mathe):

```
🕐 Volle Stunden      🥉 100 / 🥈 500 / 🥇 1000
🕑 Halbe Stunden      🥉 100 / 🥈 500 / 🥇 1000
🕒 Viertelstunden     🥉 100 / 🥈 500 / 🥇 1000
```

Anzeige auf `/uhrzeit/erfolge` - gleiches Design wie Mathe-Medaillen.

---

## Zeitrennen für Uhrzeit

- **Dauer**: 60 Sekunden
- **Modus**: Single-Select (nur ein Übungstyp)
- **Rekord-Tracking**: Pro Übungstyp (Volle/Halbe/Viertel)
- **Anzeige**: 3 Cards auf `/uhrzeit/erfolge`

---

## Implementierung: Phasen

### Phase 1: Rebranding & Struktur-Umbau ✅ ABGESCHLOSSEN
**Ziel**: App-Name ändern, neue Kategoriestruktur

1. **Rebranding**
   - [x] Titel ändern: "Mathe-Trainer" → "Schlaufuchs 🦊"
   - [x] package.json umbenennen
   - [x] index.html Titel ändern
   - [x] README.md aktualisieren
   - [x] CLAUDE.md aktualisieren
   - [x] localStorage Keys umbenannt (schlaufuchs-*)
   - [x] GitHub Workflow angepasst (deploy.yml)
   - [x] angular.json aktualisiert

2. **Neue Homepage**
   - [x] CategoryHomeComponent erstellt
   - [x] Zwei Kategorie-Cards: Mathe | Uhrzeit (prominent platziert)
   - [x] Statistik kompakt & zweispaltig (Mathe | Uhrzeit)
   - [x] Tagesziel für Mathe mit Progress Bar
   - [x] Generischer Subtext: "Üben macht den Meister!"
   - [x] Kategorien auf Mobile immer sichtbar oben

3. **Routes umstrukturieren**
   - [x] `/` → CategoryHomeComponent
   - [x] `/mathe` → Mathe-Übersicht (neue CategoryOverviewComponent)
   - [x] `/mathe/uebung` → bestehende ExerciseComponent
   - [x] `/mathe/zeitrennen` → ExerciseComponent (mode: timeTrial)
   - [x] `/mathe/erfolge` → AchievementsComponent
   - [x] Platzhalter für `/uhrzeit/*` Routen
   - [x] Redirects für alte Routes (Rückwärtskompatibilität)
   - [x] Navigation-Hierarchie korrigiert (Zurück-Buttons)

4. **Layout & UI**
   - [x] Globales box-sizing und overflow-Kontrolle (styles.css)
   - [x] Konsistente Container-Breiten auf allen Seiten
   - [x] Keine horizontalen Scrollbalken mehr
   - [x] Kompakte Statistik-Darstellung
   - [x] Responsive Design (Desktop, Tablet, Mobile)

5. **StatsService erweitern**
   - [ ] Kategorie-Support (category: 'math' | 'clock') → Verschoben auf Phase 2
   - [ ] Separate Statistiken pro Kategorie → Wenn Clock-Übungen existieren
   - [ ] Separate Tagesziele pro Kategorie → Wenn Clock-Übungen existieren

---

### Phase 2: Clock Basics ✅ ABGESCHLOSSEN
**Ziel**: Analoge Uhr-Komponente & Grundübungen

1. **ClockDisplayComponent (SVG)**
   - [x] Zifferblatt zeichnen (1-12)
   - [x] Stundenzeiger mit korrekter Berechnung
   - [x] Minutenzeiger mit korrekter Berechnung
   - [x] Input: Stunden & Minuten (als Signals)
   - [x] Responsive Design

2. **ClockService**
   - [x] Zufällige Zeit generieren (Typ-abhängig: full/half/quarter)
   - [x] Validierung (HH:MM Format mit Regex)
   - [x] Vormittag/Nachmittag Logik
   - [x] Konvertierung: Analog → 24h Format
   - [x] Helper-Methoden (getTypeLabel, getTimeOfDayLabel)

3. **ClockExerciseComponent**
   - [x] Type-Selector (Volle / Halbe / Viertel)
   - [x] ClockDisplay eingebunden
   - [x] Tageszeit-Anzeige (☀️ Vormittag / 🌙 Nachmittag)
   - [x] HH:MM Eingabefeld mit Auto-Format
   - [x] Numpad für mobile Eingabe
   - [x] Feedback (richtig/falsch mit Animation)
   - [x] Auto-advance nach Antwort
   - [x] Keyboard Support (Enter, Backspace, Digits, Colon)

4. **Routes**
   - [x] `/uhrzeit` → Uhrzeit-Übersicht (CategoryOverviewComponent)
   - [x] `/uhrzeit/uebung` → ClockExerciseComponent
   - [x] CategoryOverviewComponent angepasst (nur Übung für Uhrzeit)
   - [x] "Bald verfügbar" Badge entfernt

---

### Phase 3: Uhrzeit Statistik & Medaillen
**Ziel**: Lifetime Stats & Erfolge für Uhrzeit

1. **StatsService erweitern**
   - [ ] Lifetime Stats für Clock-Types (volle/halbe/viertel)
   - [ ] Medal-Level Berechnung für Clock
   - [ ] Fortschrittsbalken

2. **AchievementsComponent für Uhrzeit**
   - [ ] Medaillen-Grid für Clock-Types
   - [ ] Design analog zu Mathe-Medaillen
   - [ ] Route: `/uhrzeit/erfolge`

3. **Statistik-Integration**
   - [ ] Clock-Stats auf Homepage (rechte Spalte)
   - [ ] Tagesziel für Uhrzeit
   - [ ] Persistierung

---

### Phase 4: Uhrzeit Zeitrennen
**Ziel**: Time Trial für Uhrzeit-Übungen

1. **ClockExerciseComponent erweitern**
   - [ ] Mode: 'practice' | 'timeTrial'
   - [ ] Timer (60s)
   - [ ] Separate Stats (nicht in daily)
   - [ ] Schnelleres Feedback (kürzere Delays)

2. **TimedChallengeService erweitern**
   - [ ] Support für Clock-Types
   - [ ] Separate Rekorde (clock-volle, clock-halbe, clock-viertel)

3. **Routes**
   - [ ] `/uhrzeit/zeitrennen` → ClockExerciseComponent (mode: timeTrial)

4. **Erfolge-Seite**
   - [ ] Zeitrennen-Rekorde für Clock anzeigen
   - [ ] 3 Cards (Volle / Halbe / Viertel)

---

### Phase 5: Polish & Testing
**Ziel**: Feinschliff & Qualitätssicherung

1. **UI/UX**
   - [ ] Fuchs-Logo/Icon erstellen
   - [ ] Farbschema für Uhrzeit-Bereich (Blau/Lila?)
   - [ ] Animationen für Clock
   - [ ] Mobile Optimierung

2. **Testing**
   - [ ] Unit Tests für ClockService
   - [ ] Unit Tests für ClockExerciseComponent
   - [ ] E2E: Uhrzeit-Übungen durchspielen
   - [ ] Statistik-Persistierung testen

3. **Dokumentation**
   - [ ] README aktualisieren
   - [ ] GAMIFICATION.md aktualisieren
   - [ ] Screenshots erneuern

---

## Technische Details

### Neue Services
```typescript
// src/app/services/clock.service.ts
- generateClockProblem(type: 'full' | 'half' | 'quarter')
- validateTime(answer: string, expected: Time)
- isCorrectFormat(input: string): boolean
```

### Neue Components
```typescript
// src/app/components/category-home/category-home.component.ts
// Startseite mit Kategorien

// src/app/components/category-overview/category-overview.component.ts
// Übersicht für Mathe/Uhrzeit (wiederverwendbar)

// src/app/components/clock-display/clock-display.component.ts
// SVG Zifferblatt

// src/app/components/clock-exercise/clock-exercise.component.ts
// Uhrzeit-Übungen
```

### localStorage Keys
```
schlaufuchs-stats-math          // Tägliche Mathe-Stats
schlaufuchs-stats-clock         // Tägliche Uhrzeit-Stats
schlaufuchs-lifetime-math       // Lifetime Mathe-Stats
schlaufuchs-lifetime-clock      // Lifetime Uhrzeit-Stats
schlaufuchs-time-trials-math    // Zeitrennen Mathe
schlaufuchs-time-trials-clock   // Zeitrennen Uhrzeit
schlaufuchs-achievements        // Malfolgen-Meister (bleibt)
```

---

## Design-Konzepte

### Homepage
```
┌──────────────────────────────────────┐
│   🦊 Schlaufuchs                     │
│                                      │
│   📊 Heutige Statistik               │
│   ┌─────────────┬─────────────┐     │
│   │ 📐 Mathe    │ 🕐 Uhrzeit  │     │
│   │ ✓ 32  ✗ 3  │ ✓ 15  ✗ 1  │     │
│   │ Σ 35        │ Σ 16        │     │
│   │ Ziel: 32/20│ Ziel: 15/20 │     │
│   │ [========] │ [======    ] │     │
│   └─────────────┴─────────────┘     │
│                                      │
│   ┌────────────┐  ┌────────────┐    │
│   │  📐        │  │ 🕐         │    │
│   │  Mathe     │  │ Uhrzeit    │    │
│   │            │  │ lernen     │    │
│   └────────────┘  └────────────┘    │
└──────────────────────────────────────┘
```

### Mathe-Übersicht (/mathe)
```
┌──────────────────────────────────────┐
│   ← Zurück                           │
│                                      │
│   📐 Mathe                           │
│   Statistik: ✓ 32  ✗ 3  Ziel: 32/20│
│                                      │
│   ┌────────┐ ┌────────┐ ┌────────┐  │
│   │ 📚     │ │ ⏱️     │ │ 🏆     │  │
│   │ Übung  │ │ Zeit-  │ │ Erfolge│  │
│   │        │ │ rennen │ │        │  │
│   └────────┘ └────────┘ └────────┘  │
└──────────────────────────────────────┘
```

### Uhrzeit-Übung (/uhrzeit/uebung)
```
┌──────────────────────────────────────┐
│   ← Zurück                           │
│                                      │
│   [Volle] [Halbe] [Viertel]         │
│                                      │
│   Es ist Nachmittag 🌙              │
│                                      │
│         12                           │
│      9  📍  3    ← Analoge Uhr       │
│         6                            │
│                                      │
│   Wie spät ist es?                  │
│   [ __ : __ ]  (24h Format)         │
│                                      │
│   [Numpad: 0-9, :, ←, OK]           │
└──────────────────────────────────────┘
```

---

## Nächste Schritte
✅ Plan erstellt
⬜ Phase 1 starten: Rebranding & Struktur-Umbau
