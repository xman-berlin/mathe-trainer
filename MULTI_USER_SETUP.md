# Multi-User Funktionalität - Setup Guide

## Übersicht

Schlaufuchs unterstützt jetzt mehrere Benutzer mit:
- ✅ Einfacher Login (nur Benutzername, kein Passwort)
- ✅ Automatische Avatar-Generierung (DiceBear)
- ✅ Server-basierte Statistiken (Supabase)
- ✅ Tages-Streak System (mit 3-Tage-Toleranz)
- ✅ User-Wechsel
- ✅ Automatische Migration alter localStorage-Daten

## Supabase Setup (Erforderlich)

### 1. Supabase Projekt erstellen

1. Gehe zu https://supabase.com
2. Erstelle einen kostenlosen Account
3. Klicke auf "New Project"
4. Wähle einen Namen: z.B. "schlaufuchs-production"
5. Wähle ein sicheres Passwort
6. Wähle eine Region (z.B. Frankfurt für Europa)
7. Warte, bis das Projekt erstellt ist (~2 Minuten)

### 2. Datenbank-Schema einrichten

1. Gehe zu deinem Supabase Dashboard
2. Klicke im linken Menü auf "SQL Editor"
3. Klicke auf "New Query"
4. Öffne die Datei `supabase-schema.sql` aus diesem Projekt
5. Kopiere den gesamten Inhalt
6. Füge ihn in den SQL Editor ein
7. Klicke auf "Run" (oder drücke Cmd/Ctrl + Enter)
8. Warte auf die Bestätigung "Success. No rows returned"

### 3. API-Schlüssel kopieren

1. Gehe im Supabase Dashboard zu "Settings" (unten links)
2. Klicke auf "API"
3. Kopiere folgende Werte:
   - **Project URL** (steht unter "Project URL")
   - **anon public** Key (steht unter "Project API keys")

### 4. Environment-Dateien konfigurieren

#### Für Entwicklung (`src/environments/environment.ts`):

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'DEINE_PROJECT_URL_HIER',
  supabaseAnonKey: 'DEIN_ANON_KEY_HIER',
};
```

#### Für Production (`src/environments/environment.prod.ts`):

```typescript
export const environment = {
  production: true,
  supabaseUrl: 'DEINE_PROJECT_URL_HIER',
  supabaseAnonKey: 'DEIN_ANON_KEY_HIER',
};
```

**Wichtig:** Ersetze die Platzhalter-Werte mit deinen echten Supabase-Credentials!

### 5. App starten

```bash
npm run start
```

Die App öffnet sich unter http://localhost:4200 und sollte zur Login-Seite weiterleiten.

## Features

### Login-System

- **Kein Passwort erforderlich** - Nur Benutzername (kinderfreundlich!)
- **Avatar-Auswahl** - 6 verschiedene Avatar-Stile verfügbar
- **User-Liste** - Alle existierenden Benutzer werden angezeigt
- **Suchfunktion** - Schnelles Finden von Benutzern

### Tages-Streak System

- **Automatische Tracking** - Streak wird bei erster korrekter Antwort des Tages aktualisiert
- **3-Tage-Toleranz** - Streak bleibt erhalten, wenn du 1-3 Tage pausierst
- **Meilensteine** - Belohnungen bei 7, 14, 30, 50, 100 und 365 Tagen
- **Rekord-Tracking** - Längste Streak wird separat gespeichert

### Daten-Synchronisierung

- **Cache-First** - Schnelle lokale Updates
- **Background Sync** - Automatische Server-Synchronisierung
- **Offline-Support** - Funktioniert auch ohne Internet (Sync erfolgt später)
- **Source of Truth** - Server-Daten überschreiben lokale Daten beim App-Start

### Daten-Migration

Beim ersten Login nach dem Update:
1. Dialog erscheint: "Willkommen zur neuen Version!"
2. Zwei Optionen:
   - **Meine Daten übernehmen** - Alte localStorage-Daten werden zum neuen Account migriert
   - **Neu starten** - Ohne alte Daten beginnen

## Architektur

### Services

- **AuthService** - User-Session-Verwaltung mit Signals
- **SupabaseService** - Wrapper für Supabase-Client mit typsicheren Methoden
- **AvatarService** - DiceBear URL-Generierung
- **DailyStreakService** - Streak-Berechnung und Meilenstein-Tracking
- **MigrationService** - Einmalige Daten-Migration von localStorage
- **StatsService** - Erweitert um Server-Sync (abwärtskompatibel)

### Komponenten

- **LoginComponent** - Login-Seite mit User-Auswahl und Erstellung
- **UserProfileComponent** - Kompaktes Profil-Widget für Header
- **StreakDisplayComponent** - Prominente Streak-Anzeige mit Fortschritt

### Guards

- **authGuard** - Schützt alle Routes außer `/login`

### Models

- **User** - Benutzer-Daten
- **DailyStreak** - Streak-Informationen
- **DailyStats** - Tägliche Statistiken
- **LifetimeStats** - Lebenslange Achievements
- **PersonalBest** - Time Trial Rekorde
- **MultiplicationMastery** - Einmaleins-Fortschritt

## Datenbank-Schema

### Tabellen

- `users` - Benutzerkonten
- `daily_stats` - Tägliche Statistiken pro User
- `lifetime_stats` - Lebenslange Achievements
- `time_trial_bests` - Persönliche Bestzeiten
- `multiplication_mastery` - Einmaleins-Meisterschaft
- `daily_streaks` - Streak-Tracking (NEU)

### Row Level Security (RLS)

- Users können nur ihre eigenen Daten lesen/schreiben
- User-Liste ist öffentlich lesbar (für Login-Seite)
- Automatischer Schutz durch Supabase Policies

## Troubleshooting

### "Failed to load from server"

**Problem:** App kann nicht mit Supabase verbinden

**Lösung:**
1. Prüfe Internet-Verbindung
2. Prüfe `environment.ts` - sind die Credentials korrekt?
3. Prüfe Supabase Dashboard - ist das Projekt aktiv?
4. Öffne Browser DevTools - gibt es CORS-Fehler?

### "User nicht gefunden" beim Login

**Problem:** Datenbank ist leer oder User existiert nicht

**Lösung:**
1. Klicke auf "Neuer Charakter"
2. Erstelle einen neuen User
3. Prüfe Supabase Dashboard > Table Editor > users - ist der User angelegt?

### Migration-Dialog erscheint nicht

**Problem:** localStorage-Migration wurde bereits als abgeschlossen markiert

**Lösung:**
```javascript
// In Browser DevTools Console:
localStorage.removeItem('schlaufuchs-migrated');
// Seite neu laden
```

### Streak wird nicht aktualisiert

**Problem:** Streak-Service konnte nicht mit Server synchronisieren

**Lösung:**
1. Prüfe Browser DevTools Console auf Fehler
2. Logout und erneuter Login
3. Prüfe Supabase Dashboard > Table Editor > daily_streaks

## Development

### Lokale Entwicklung

```bash
# Dev Server mit Hot Reload
npm run start

# Dev Server mit File Polling (bei Sync-Problemen)
npm run start:poll

# Production Build testen
npm run build
```

### Testing

```bash
# Unit Tests
npm run test

# Linting
npm run lint
```

## Zukünftige Erweiterungen

### Phase 2 Features (geplant)

- [ ] Leaderboards (Tages-/Wochen-Rankings)
- [ ] Freunde-System
- [ ] Tägliche Community-Challenges
- [ ] Zusätzliche Achievements
- [ ] Eltern-Dashboard
- [ ] Custom Avatar-Uploads
- [ ] Dark Mode
- [ ] Push-Benachrichtigungen für Streaks

### Technische Verbesserungen

- [ ] Service Worker für Offline-First PWA
- [ ] Background Sync API
- [ ] WebSocket-Integration (Realtime Updates)
- [ ] Avatar-Caching
- [ ] Server-Sync für Achievements & Time Trials

## Support

Bei Fragen oder Problemen:
1. Prüfe die Supabase-Logs im Dashboard
2. Prüfe Browser DevTools Console
3. Erstelle ein GitHub Issue mit:
   - Fehlermeldung
   - Browser und Version
   - Reproduktionsschritte

## Credits

- **Backend:** Supabase (PostgreSQL)
- **Avatare:** DiceBear API
- **Frontend:** Angular 20 mit Signals
- **Styling:** Custom CSS mit Mobile-First Design
