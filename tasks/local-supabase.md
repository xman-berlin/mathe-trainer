# Local Supabase Setup

## Ziel
Lokale Supabase-Instanz via Docker als Ersatz für die remote Dev-Datenbank.

## Plan
- [x] Supabase CLI installieren (`brew install supabase/tap/supabase`)
- [x] `supabase init` ausführen → `supabase/config.toml` angelegt
- [x] Core-Schema als Migration erfassen (`supabase/migrations/20260101_core_schema.sql`)
- [x] `supabase start` — alle Migrations laufen durch
- [x] `environment.ts` auf lokale URL umgestellt

## Lokaler Stack

| Dienst  | URL                        |
|---------|----------------------------|
| Studio  | http://127.0.0.1:54323     |
| API     | http://127.0.0.1:54321     |
| DB      | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

## Umschalten zwischen lokal und remote

In `src/environments/environment.ts`:
- **Lokal**: aktive Zeilen = `127.0.0.1:54321` + lokaler Anon Key
- **Remote Dev**: auskommentierte Zeilen einkommentieren

## Befehle

```bash
# Stack starten
supabase start

# Stack stoppen
supabase stop

# Stack stoppen und Daten löschen
supabase stop --no-backup

# Migrations anwenden (nach supabase start)
supabase db reset
```

## Review
Alles funktioniert. Alle 4 Migrations laufen fehlerfrei durch. Die App zeigt lokal auf `127.0.0.1:54321`.
