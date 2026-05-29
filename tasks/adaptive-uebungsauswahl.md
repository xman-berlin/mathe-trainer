# Adaptive Übungsauswahl

## Idee

Die App soll anhand der bisherigen Ergebnisse automatisch entscheiden, welche Übungstypen
ein Kind als nächstes üben soll — statt dass das Kind manuell einen Typ auswählt.

## Motivation

- Kind wählt aktuell manuell Übungstypen → bevorzugt oft das, was es schon kann
- App soll Schwächen erkennen und gezielt fördern
- Alle Übungen einer Kategorie zählen weiterhin für das Tageslimit

## Offene Fragen

- [ ] Wie stark automatisch? Nur Empfehlung, oder App wählt direkt?
- [ ] Bleiben manuelle Typ-Kacheln als Fallback erhalten?
- [ ] Welche Metrik entscheidet (Erfolgsquote, zuletzt geübt, beides)?
- [ ] Gilt das kategorieübergreifend oder pro Kategorie (Mathe, Uhrzeit, ...)?
- [ ] Ab wie vielen Versuchen ist eine Aussage statistisch sinnvoll?

## Abhängigkeiten

- Neue Uhrzeit-Übungstypen (`fiveMinAfter`, `fiveMinBefore`, `fiveMinHalf`) sollten
  zuerst fertig sein, damit die adaptive Logik alle Typen berücksichtigen kann.
  Siehe: `tasks/uhr-vor-nach-uebungen.md`
