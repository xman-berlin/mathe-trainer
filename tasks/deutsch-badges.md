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

- [ ] Add 9 badge definitions to `BadgeService` (`BADGE_DEFINITIONS` array) in `src/app/services/badge.service.ts`
- [ ] Verify `BadgeCheckData` already carries the needed fields (`lifetimeStats`, `dailyStats`, `bestStreaksByType`) for the key `'deutsch-rechtschreibung'` — no model changes needed
- [ ] Run lint + build + tests
- [ ] Smoke-test: earn `deutsch-beginner` by checking badge check logic manually

---

## Notes

- All check functions follow the same pattern as existing Uhrzeit badges
- `bestStreaksByType` is populated from `ExerciseStateService` best-streak tracking, which is already wired in `vocab-exercise.ts`
- No new DB migrations needed — badges use the existing `user_badges` table
- Badge category: `'milestone'` for lifetime badges, `'performance'` for daily/streak badges
