# Datenbank-Migration: Best Streaks für Sachaufgaben

## Was wurde geändert?

Die App speichert jetzt die **beste Serie (Best Streak)** für jede Übungsart, einschließlich Sachaufgaben. Diese Statistik wird:
- In der Datenbank gespeichert
- Beim Login/Wechseln vom Server geladen
- Über Geräte/Sessions hinweg synchronisiert

## Migrations-Schritte

### 1. Migration ausführen (Supabase)

1. Öffne dein Supabase Dashboard
2. Gehe zu **SQL Editor**
3. Öffne die Datei `migration-add-best-streaks.sql` in diesem Projekt
4. Kopiere den gesamten Inhalt
5. Füge ihn in den SQL Editor ein
6. Klicke auf **Run**

### 2. Bestätigung

Die Migration fügt eine neue Spalte `best_streaks_by_type` zur `lifetime_stats` Tabelle hinzu. Nach erfolgreicher Ausführung solltest du sehen:

```
Success. No rows returned
```

### 3. App-Update

Die App-Änderungen sind bereits implementiert. Nach der Datenbank-Migration wird die Best-Streak automatisch:
- Beim Erreichen einer neuen besten Serie gespeichert
- Beim Login vom Server geladen
- In der UI angezeigt

## Betroffene Dateien

### Backend/Datenbank
- `supabase-schema.sql` - Aktualisiertes Schema für neue Installationen
- `migration-add-best-streaks.sql` - Migrations-Script für bestehende Datenbanken

### Frontend-Code
- `src/app/models/stats.model.ts` - Erweitertes `LifetimeStats` Interface
- `src/app/services/stats.service.ts` - Neue Methoden `getBestStreak()` und `updateBestStreak()`
- `src/app/services/supabase.service.ts` - Sync von `best_streaks_by_type`
- `src/app/components/word-problem-exercise/word-problem-exercise.component.ts` - Verwendet StatsService für Best-Streak

## Testen

1. Starte die App und öffne Sachaufgaben
2. Löse mehrere Aufgaben richtig hintereinander
3. Die "Beste:"-Anzeige sollte sich aktualisieren
4. Melde dich ab und wieder an
5. Die Best-Streak sollte erhalten bleiben
6. Wechsle zwischen verschiedenen Benutzern
7. Jeder Benutzer sollte seine eigene Best-Streak haben

## Rollback (falls nötig)

Falls du die Änderung rückgängig machen möchtest:

```sql
ALTER TABLE lifetime_stats
DROP COLUMN IF EXISTS best_streaks_by_type;
```

⚠️ **Achtung:** Dies löscht alle gespeicherten Best-Streak-Daten!
