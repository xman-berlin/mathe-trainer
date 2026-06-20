# Deutsch-Trainer: Wiederholungen vermeiden

Phase-1-Session enthielt alle Wörter der aktiven Liste (auch gelernte mit weight=1)
und baute den Queue nach jeder Antwort neu → immer gleiche Wörter.

## Changes

- **`src/app/services/vocab.service.ts`**: Phase 1 filtert weight=1 Wörter raus
  (`if (weight <= 1) continue;`). Erscheinen erst wieder in Phase 2.
- **`src/app/components/vocab-exercise/vocab-exercise.ts`**: Queue wird nicht mehr
  nach jeder Antwort neugebaut, sondern erst wenn `currentIndex >= queue.length`.
  `submitAnswer()` ruft nur noch `updateWordWeight()` auf (non-blocking).

## Tests

- **`src/app/services/vocab.service.spec.ts`**: Neuer Test
  `'Phase 1: excludes words at weight 1 from session'`
- **`src/app/components/vocab-exercise/vocab-exercise.spec.ts`**: Neue Datei mit
  13 Tests (init, submit, advance, rebuild-on-exhaustion)

## Review

- Implementiert: 2026-06-20
- Alle 672 Tests grün, Lint und Build pass
