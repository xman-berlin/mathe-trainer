# Zahlenreihen ergänzen

## Goal

Mathe-Kachel „Zahlenreihen“ (Klasse 3 Wien, ZR bis 1000): Folgen mit 1–3 Lücken — Stufen 1–3 konstanter +/−; ab Stufe 4 Wechsel +/−; ab Stufe 5 (Löwe) ×/÷ und Wechsel ×/÷ — adaptive Schwierigkeit, Tagesziel Default 5. Stats zählen zur Mathe-Gesamtstatistik.

Plan: Cursor plan `zahlenreihen_ergänzen`.

## Checklist

- [x] Generator (1–3 Lücken, Eindeutigkeitsregeln) + Difficulty-Levels + Unit-Tests
- [x] Pending-Service (Reihe + Gap-Antworten)
- [x] Component UI (aktive Lücke, korrigierbar, Keypad-Flow, Serie/Beste, Stats, Difficulty-Chip)
- [x] Route, Catalog (goal 5), Overview-Kachel, Stats in Mathe-Gesamtsumme + Ziele-Modal
- [x] Browser-Test lokal (OK; Löwe entschärft: weniger ×/÷, mildere Schritte, selten 3 Lücken)
- [x] E2E + Full Suite
- [x] README + `tasks/todo.md`

## Review

Shipped in PR #52 (merged 2026-11-20).

- Mathe tile `/mathe/zahlenreihen` with adaptive difficulty (`numberSequences`), daily goal 5, pending resume, streak persistence
- Patterns: constant +/− (1–3), alternating +/− from Adler, ×/÷ from Löwe (softened after playtest)
- Also hardened Stats/Difficulty load to merge local+server so empty Supabase cannot wipe offline progress

Deviations: Löwe made milder than first draft; review mix capped at −1 tier; no new DB tables (JSONB keys only).
