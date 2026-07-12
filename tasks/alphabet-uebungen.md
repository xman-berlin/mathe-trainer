# Alphabet-Übungen (Deutsch)

Alphabetübungen für die Deutsch-Kategorie: Vorher/Nachher, Lücken-Alphabet, ABC-Sortierung.

## Struktur

- Neue Zwischenseite `/deutsch/alphabet` mit 3 Karten (analog Deutsch-Übersicht)
- Feste Wortlisten (kein Supabase, kein Vocab-Service)
- Bestehende Patterns (Standalone-Components, Signals, `ExerciseStateService`, `StatsService`)

## Reihenfolge

1. Vorher/Nachher (`abc-vorher-nachher`)
2. Lücken-Alphabet (`abc-luecken`)
3. ABC-Sortierung (`abc-sortieren`)

## Neue Dateien

```
src/app/components/
  alphabet-category-overview/       # Kategorie-Seite /deutsch/alphabet
    alphabet-category-overview.ts
    alphabet-category-overview.html
    alphabet-category-overview.scss
  abc-vorher-nachher/               # Übung 1
    abc-vorher-nachher.ts
    abc-vorher-nachher.html
    abc-vorher-nachher.scss
  abc-luecken/                      # Übung 2
    abc-luecken.ts
    abc-luecken.html
    abc-luecken.scss
  abc-sortieren/                    # Übung 3
    abc-sortieren.ts
    abc-sortieren.html
    abc-sortieren.scss
src/app/data/
  alphabet-words.ts                 # Feste Wortliste für Sortierung
```

## Routing (in `app.routes.ts`)

```typescript
{ path: 'deutsch/alphabet',           component: AlphabetCategoryOverviewComponent, canActivate: [authGuard] },
{ path: 'deutsch/abc-vorher-nachher', component: AbcVorherNachherComponent,        canActivate: [authGuard] },
{ path: 'deutsch/abc-luecken',        component: AbcLueckenComponent,              canActivate: [authGuard] },
{ path: 'deutsch/abc-sortieren',      component: AbcSortierenComponent,            canActivate: [authGuard] },
```

## Stat-Typen

- `'deutsch-abc-vorher-nachher'`
- `'deutsch-abc-luecken'`
- `'deutsch-abc-sortierung'`

## Übung 1: Vorher/Nachher

- Zeige einen Buchstaben + Frage "Welcher Buchstabe kommt vor [X]?" oder "Welcher Buchstabe kommt nach [X]?"
- 4 Multiple-Choice-Buttons (Buchstaben)
- 1 richtig + 3 plausible Distraktoren (benachbarte Buchstaben)
- Leicht: A–Z (ohne Umlaute)
- Schwer: +Ä, Ö, Ü, ß
- `letter-keypad` wird nicht gebraucht — eigener Satz Buttons

## Übung 2: Lücken-Alphabet

- Zeige eine Buchstaben-Sequenz mit Lücken: `A _ C _ E`
- Kind füllt Lücken nacheinander via Letter-Keypad
- Level:
  - Leicht: 1 Lücke, benachbarte Buchstaben (A _ C)
  - Mittel: 2 Lücken (A _ _ D)
  - Schwer: mehrere Lücken, auch Umlaute
- Bestehendes `app-letter-keypad` wiederverwenden

## Übung 3: ABC-Sortierung

- 3–5 Wörter aus festem Pool anzeigen (shuffled)
- Kind klickt Wörter in alphabetischer Reihenfolge an
- Fester Wortpool: `alphabet-words.ts` — pro Buchstabe 2–3 einfache Wörter
- Kein Letter-Keypad, eigene Wortkarten-Interaktion
- Level:
  - Leicht: 3 Wörter, verschiedene Anfangsbuchstaben
  - Mittel: 4 Wörter, teils gleiche Anfangsbuchstaben
  - Schwer: 5 Wörter, zweiter Buchstabe entscheidet

## Prüfschritte

- [ ] Alphabet-Übersichtsseite mit 3 Karten + Routing
- [ ] Vorher/Nachher: Multiple-Choice, Stat-Tracking, Streak
- [ ] Lücken-Alphabet: Letter-Keypad, Levels, Stat-Tracking
- [ ] ABC-Sortierung: Wortkarten, Klick-Reihenfolge, Levels
- [ ] Navigations-Test in E2E (klick durch alle neuen Seiten)
- [ ] Lint + Build + Tests grün
