# Deutsch Badges

## Goal

Add a set of badges specific to the Deutsch / Rechtschreibung exercise, consistent with the existing badge system (Mathe, Uhrzeit).

---

## Badge Definitions

### Meilenstein — Lifetime correct words (`lifetimeStats['deutsch-rechtschreibung']`)

| ID | Name | Icon | Bedingung | Coins |
|---|---|---|---|---|
| `deutsch-beginner` | Rechtschreib-Anfänger | 📝 | ≥ 10 richtige Wörter gesamt | 25 |
| `deutsch-apprentice` | Rechtschreib-Lehrling | ✏️ | ≥ 50 richtige Wörter gesamt | 50 |
| `deutsch-scholar` | Wortkenner | 📚 | ≥ 200 richtige Wörter gesamt | 100 |
| `deutsch-master` | Rechtschreib-Meister | 🎓 | ≥ 500 richtige Wörter gesamt | 250 |
| `deutsch-champion` | Rechtschreib-Champion | 🏆 | ≥ 1000 richtige Wörter gesamt | 500 |

### Tagesform — Daily stats (`dailyStats['deutsch-rechtschreibung']`)

| ID | Name | Icon | Bedingung | Coins |
|---|---|---|---|---|
| `deutsch-daily-10` | Fleißige Feder | 🪶 | ≥ 10 richtige Wörter heute | 30 |
| `deutsch-perfect-day` | Fehlerfreier Tag | ⭐ | ≥ 20 Antworten heute, 100 % Genauigkeit | 100 |

### Serien — Best streak in session (`bestStreaksByType['deutsch-rechtschreibung']`)

| ID | Name | Icon | Bedingung | Coins |
|---|---|---|---|---|
| `deutsch-streak-10` | Wort-Serie | 🔥 | Beste Streak ≥ 10 | 50 |
| `deutsch-streak-25` | Wort-Strom | ⚡ | Beste Streak ≥ 25 | 150 |

---

## Implementation Plan

- [x] Add 9 badge definitions to `BadgeService` (`BADGE_DEFINITIONS` array) in `src/app/services/badge.service.ts`
- [x] Verify `BadgeCheckData` already carries the needed fields (`lifetimeStats`, `dailyStats`, `bestStreaksByType`) for the key `'deutsch-rechtschreibung'` — no model changes needed
- [x] Run lint + build + tests
- [x] Smoke-test: earn `deutsch-beginner` by checking badge check logic manually
- [x] Unit tests: 23 tests in `badge.service.spec.ts` covering all 9 badges with boundary conditions

---

## Review

**Changes:**

1. `src/app/services/badge.service.ts`
   - Added 9 badge definitions to `BADGE_DEFINITIONS` array
   - Added progress calculation logic for `deutsch-*` badges in `getBadgeProgress()`
   - No model changes needed — `BadgeCheckData` already supports the required fields

2. `src/app/services/badge.service.spec.ts` (new)
   - 23 unit tests covering all 9 badges with boundary conditions (below/at/above threshold, missing data)

3. `src/app/services/stats.service.ts`
   - Bug fix: added `checkBadges()` call after loading lifetime stats from server, so badges missed due to session-only `answerCounter` are caught on app load

**Verification:**
- `npm run lint` — all files pass
- `npm run build` — success (budget warnings are pre-existing)
- `npm run test -- --watch=false --browsers=ChromeHeadless` — 25/25 tests pass (2 existing + 23 new)

**Completed:** 2026-03-24

---

## Notes

- All check functions follow the same pattern as existing Uhrzeit badges
- `bestStreaksByType` is populated from `ExerciseStateService` best-streak tracking, which is already wired in `vocab-exercise.ts`
- No new DB migrations needed — badges use the existing `user_badges` table
- Badge category: `'milestone'` for lifetime badges, `'performance'` for daily/streak badges
