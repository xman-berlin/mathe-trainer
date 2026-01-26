# Gamification Ideas

## Implementiert

### Streak-Zähler ✓
- Anzahl richtige Antworten in Folge
- Visuelle Meilensteine: 5, 10, 20, 30, 40, 50, 75, 100
- Flammen-Emoji und orange Gradient bei aktivem Streak
- Rekord-Anzeige

### Konfetti-Animation ✓
- Bunte Konfetti-Stücke bei Meilensteinen
- Zufällige Positionen

### Malfolgen-Meister Badge ✓
- Badge pro Einmaleins-Reihe (10x fehlerfrei)
- Achievements-Seite zur Anzeige

### Tägliches Ziel mit Fortschrittsbalken ✓
- Anpassbares Tagesziel (Standard: 20 Aufgaben)
- Visueller Fortschrittsbalken auf der Startseite
- "Ziel erreicht" Badge mit Konfetti-Animation
- Persistierung über localStorage

### Zeitrennen-Modus (60 Sekunden) ✓
- Separate Route `/zeitrennen` für Time Trial
- 60-Sekunden Countdown mit kritischem Zustand (< 10s)
- Single-Select für Rechenart (nur eine gleichzeitig)
- Personal Best Tracking pro Rechenart
- Rekord-Anzeige auf Erfolge-Seite
- Spezielle Celebration bei neuem Rekord (Konfetti, Trophäe, Animationen)
- Keine Reihenauswahl bei Multiplikation/Division (immer 1-10)

### UI-Verbesserungen ✓
- Navigation entfernt
- Action Cards auf Startseite (Übung / Zeitrennen / Erfolge)
- Zurück-Button auf allen Unterseiten (Desktop: oben links, Mobile: floating unten links)
- Statistik prominent auf Startseite

### Medaillen-System pro Rechenart ✓
- Kumulative Erfolge pro Rechenart (Addition, Subtraktion, Multiplikation, Division)
- 🥉 Bronze: 100 richtige Antworten (gesamt, über alle Tage)
- 🥈 Silber: 500 richtige Antworten
- 🥇 Gold: 1000 richtige Antworten
- Fortschrittsbalken bis zur nächsten Stufe (z.B. "247/500 bis Silber")
- Lebenslange Statistik (separater localStorage Key)
- Anzeige auf Erfolge-Seite zwischen Malfolgen-Meister und Zeitrennen
- Kompakte Card-Darstellung mit 4 Spalten (Desktop), 2 Spalten (Mobile)

---

## Offen

### Fortschritt & Belohnungen

### Levels & Progression
- [ ] XP-System mit Level-Aufstieg
- [ ] Schwierigkeitsgrade freischalten (größere Zahlenräume)

### Visuelles Feedback
- [ ] Charaktere/Avatare die sich freuen oder traurig schauen
- [ ] Fortschritts-Baum der mit jeder Aufgabe wächst

### Wettbewerb & Motivation
- [ ] Tages-Highscore für Übungsmodus
- [ ] Wochen-Challenge (Gesamtziel über die Woche)
- [ ] Mehrere Zeitrennen-Modi (30s, 60s, 120s)

---

## Nächste Schritte
1. XP-System mit Levels
2. Wochen-Challenges
3. Schwierigkeitsgrade / größere Zahlenräume
4. Mehrere Zeitrennen-Modi (30s, 120s)
