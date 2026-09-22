# Difficulty level mix + Löwe/Drache redesign

## Product decisions

### 80/20 mix (all operations)

- **80 %** current level / **20 %** review — every 5th task is a review (exact 20 %)
- For **+/− at Löwe/Drache** (level ≥ 5): review pool is **levels 1–4 only** (Zahlenraum ≤ 100)
- Level 1 stays 100 % Maus
- `exact: true` skips the mix (unit tests / fallbacks)
- +/− levels 5–6 raise the effective Zahlenraum to **1000** even if the user setting is still 100

### Addition / Subtraction — Löwe & Drache

| Stufe | Name | Pattern |
|-------|------|---------|
| 4 | Adler | unchanged (1–100, >10er carry) |
| 5 | Löwe | **100–1000**, hundreds only (…00) |
| 6 | Drache | **100–1000**, tens + hundreds, ones = 0 |

Examples: Löwe `300 + 400`, `900 − 200`; Drache `250 + 370`, `730 − 260`.

## Implementation checklist

- [x] `pickEffectiveLevel()` 80/20 + `exact` option
- [x] Wire mix into +/−/×/÷ generators
- [x] Redesign Löwe / Drache addition & subtraction
- [x] Review pool for Löwe/Drache = levels 1–4 (100er)
- [x] Level raises effective max so Zahlenraum 100 cannot block Löwe/Drache
- [x] Operands/results for Löwe/Drache lower-bounded at 100
- [x] Unit tests (exact patterns + mix + range)
- [x] Browser-test Mathe +/− at mid/high level
- [x] Run full test suite

## Review

**Completed:** 2026-09-22

**Shipped:**
- 80/20 mix via every-5th-task counter; +/− at Löwe/Drache reviews levels 1–4 only
- Löwe = hundreds only; Drache = ones digit 0; both in Zahlenraum **100–1000**
- `generateProblem` uses `Math.max(userZahlenraum, levelMin)` for +/− so a stale „bis 100“ setting no longer strips Drache tasks
- Specs updated (`exact: true` for pattern tests; mix / Zahlenraum regression coverage)

**Deviations:**
- Mix is deterministic (every 5th) rather than random 20 %, for predictable review
- ×/÷ keep uniform lower-level review (not limited to a smaller Zahlenraum pool)
