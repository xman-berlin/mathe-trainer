# Difficulty level mix + Löwe/Drache redesign

## Product decisions

### 80/20 mix (all operations)

- **80 %** current level / **20 %** review — every 5th task is a review (exact 20 %)
- Review pool is at most **2 levels below** (e.g. Drache → Adler/Löwe; never Maus/Fuchs)
- Level 1 stays 100 % Maus
- `exact: true` skips the mix (unit tests / fallbacks)
- +/− levels 5–6 raise the effective Zahlenraum to **1000** even if the user setting is still 100
- All answers stay **≤ 999** (3-digit keypad)

### Addition / Subtraction — Löwe & Drache

| Stufe | Name | Addition | Subtraktion (Klasse-3 1000er) |
|-------|------|----------|-------------------------------|
| 4 | Adler | unchanged (1–100, >10er carry) | unchanged |
| 5 | Löwe | **100–999**, hundreds only (…00) | reine Hunderter (`800−300`) **oder** ohne Unterschreitung (`670−40`) |
| 6 | Drache | **100–999**, tens+hundreds, ones = 0 | Zehnerunterschreitung (`420−50`) **oder** Hunderterunterschreitung (`530−160`) |

Examples addition: Löwe `300 + 400`; Drache `250 + 370`.

## Implementation checklist

- [x] `pickEffectiveLevel()` 80/20 + `exact` option
- [x] Wire mix into +/−/×/÷ generators
- [x] Redesign Löwe / Drache addition & subtraction
- [x] Review pool at most 2 levels below (all operations)
- [x] Level raises effective max so Zahlenraum 100 cannot block Löwe/Drache
- [x] Operands/results for Löwe/Drache lower-bounded at 100
- [x] Unit tests (exact patterns + mix + range)
- [x] Browser-test Mathe +/− at mid/high level
- [x] Run full test suite

## Review

**Completed:** 2026-09-22

**Shipped:**
- 80/20 mix via every-5th-task counter; review from at most 2 levels below
- Löwe = hundreds only; Drache = ones digit 0; both with answers **≤ 999**
- `generateProblem` uses `Math.max(userZahlenraum, levelMin)` for +/− so a stale „bis 100“ setting no longer strips Drache tasks
- Specs updated (`exact: true` for pattern tests; mix / Zahlenraum regression coverage)

**Deviations:**
- Mix is deterministic (every 5th) rather than random 20 %, for predictable review
- Review window narrowed from „all lower levels“ / „1–4 for +/−“ to **±2 stages** (2026-09-28)
- Subtraction Löwe/Drache redesigned to Klasse-3 curriculum (2026-09-28): not the same patterns as addition
