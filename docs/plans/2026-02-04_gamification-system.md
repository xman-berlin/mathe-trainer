# Gamification System: Badge-System, Coins & Flappy Fox

## Überblick

Implementierung eines umfassenden Gamification-Systems für Schlaufuchs:
- **Badge-System**: 20+ Badges in 4 Kategorien (Performance, Konsistenz, Meilensteine, Challenges)
- **Globale Erfolgsseite**: Einheitliche `/erfolge` Route mit Tabs (Mathe, Uhrzeit, Badges, Spiele)
- **Coins-System**: Virtuelle Währung mit localStorage + Supabase Sync
- **Flappy Fox Spiel**: Canvas-basiertes Belohnungsspiel für 100 Coins

## Taskliste

### Phase 1: Foundation
- [x] Supabase Migration erstellen (user_badges, coin_balances, coin_transactions, game_scores)
- [x] TypeScript Models erstellen (badge.model.ts, coin.model.ts, game.model.ts)
- [x] SupabaseService erweitern

### Phase 2: Badge & Coins System
- [x] CoinsService implementieren (localStorage + Supabase Sync, offline Queue)
- [x] BadgeService implementieren (22 Badge-Definitionen, 4 Kategorien)
- [x] Coin-Integration in StatsService (1 Coin pro richtige Antwort, 10 für Tagesziel)
- [x] Coin-Integration in DailyStreakService (Streak-Meilensteine)
- [x] AuthService erweitern (Coins/Badges bei Login laden)
- [x] BadgeDisplayComponent erstellen

### Phase 3: Global Achievements
- [x] GlobalAchievementsComponent mit Tabs erstellen
- [x] Routing aktualisieren (/erfolge als Hauptroute)
- [x] AchievementsComponent als @Input refactoren
- [x] Homepage Erfolge-Card mit Coins-Anzeige
- [x] Stats in Category-Cards integrieren

### Phase 4: Flappy Fox Spiel
- [ ] GameService implementieren
- [ ] FlappyFoxComponent erstellen (Canvas-basiert)
- [ ] Touch + Keyboard Controls
- [ ] Coin-Kosten (100) und High Score Persistierung
- [ ] Games-Tab in GlobalAchievements befüllen

## Architektur-Entscheidungen

### 1. Badge-Datenmodell
- Badge-Definitionen als TypeScript-Konstanten
- Fortschritt wird aus bestehenden Stats berechnet (keine redundante Speicherung)
- Nur verdiente Badges werden in neuer `user_badges` Tabelle gespeichert

### 2. Coins-Architektur
- Zentraler **CoinsService** (nicht in StatsService integriert)
- Transaction History für Debugging
- Offline-Support mit Transaction Queue

### 3. Erfolgsseite
- **Single Global Page** bei `/erfolge` mit Tabs
- Tabs: Mathe | Uhrzeit | Badges | Spiele
- Keine Code-Duplikation
- Coin-Balance im Header sichtbar

### 4. Flappy Fox Implementierung
- Canvas-basiert mit separater Route `/spielen/flappy-fox`
- Klassisches Flappy Bird Gameplay
- Touch + Keyboard Controls (Space zum Flattern)
- 100 Coins Kosten pro Spiel
- High Score Persistierung pro User

## Datenmodelle

### Neue Supabase Tabellen

```sql
-- Speichert verdiente Badges pro User
CREATE TABLE user_badges (
  user_id UUID REFERENCES users(id),
  badge_id TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(user_id, badge_id)
);

-- Speichert Coin-Guthaben pro User
CREATE TABLE coin_balances (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction Log für Auditing
CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  amount INTEGER, -- Positiv = verdient, Negativ = ausgegeben
  reason TEXT, -- 'correct_answer', 'badge_earned', 'game_cost', etc.
  related_id TEXT, -- badge_id, exercise_type, game_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spiel-Scores pro User pro Spiel
CREATE TABLE game_scores (
  user_id UUID REFERENCES users(id),
  game_id TEXT,
  high_score INTEGER DEFAULT 0,
  times_played INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(user_id, game_id)
);
```

### TypeScript Models

**src/app/models/badge.model.ts**:
```typescript
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji
  category: 'performance' | 'consistency' | 'milestone' | 'challenge';
  requiredProgress: number;
  coinReward: number;
  checkFunction: (data: BadgeCheckData) => boolean;
}

export interface BadgeCheckData {
  lifetimeStats: Record<string, number>;
  dailyStats: Record<string, { correct: number; incorrect: number }>;
  currentStreak: number;
  longestStreak: number;
  bestStreaksByType: Record<string, number>;
  timeTrialBests: PersonalBest[];
  masteredReihen: number[];
}
```

**src/app/models/coin.model.ts**:
```typescript
export interface CoinTransaction {
  user_id: string;
  amount: number;
  reason: 'correct_answer' | 'daily_goal' | 'badge_earned' | 'streak_milestone' | 'game_cost';
  related_id?: string;
  created_at: string;
}

export interface CoinBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
}
```

**src/app/models/game.model.ts**:
```typescript
export interface GameConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  costToPlay: number;
  route: string;
}

export interface GameScore {
  game_id: string;
  high_score: number;
  times_played: number;
}
```

## Neue Services

### BadgeService (`src/app/services/badge.service.ts`)
**Verantwortlichkeiten**:
- Definiert alle Badge-Konfigurationen
- Prüft Badge-Berechtigung
- Vergibt Badges und löst Coin-Belohnungen aus
- Synct zu Supabase

**Key Methods**:
```typescript
loadEarnedBadges(userId: string): Promise<void>
checkAndAwardBadges(userId: string, data: BadgeCheckData): Promise<Badge[]>
getBadgeProgress(badgeId: string): { current: number; required: number }
isBadgeEarned(badgeId: string): boolean
```

### CoinsService (`src/app/services/coins.service.ts`)
**Verantwortlichkeiten**:
- Verwaltet Coin-Balance Signal
- Erfasst Transaktionen
- Vergibt/gibt Coins aus mit Validierung
- Synct zu Supabase
- Queue für Offline-Transaktionen

**Key Methods**:
```typescript
loadBalance(userId: string): Promise<void>
awardCoins(userId: string, amount: number, reason: string, relatedId?: string): Promise<void>
spendCoins(userId: string, amount: number, reason: string, relatedId?: string): Promise<void>
canAfford(amount: number): boolean
```

### GameService (`src/app/services/game.service.ts`)
**Verantwortlichkeiten**:
- Verwaltet verfügbare Spiele
- Handhabt Spiel-Sessions (Coin-Abzug)
- Speichert und lädt High Scores

**Key Methods**:
```typescript
loadScores(userId: string): Promise<void>
startGame(userId: string, gameId: string): Promise<void>
saveScore(userId: string, gameId: string, score: number): Promise<boolean>
getHighScore(gameId: string): number
```

## Neue Komponenten

### 1. GlobalAchievementsComponent (`src/app/components/global-achievements/`)
- Vereinheitlichte Erfolgsseite
- Tab-Navigation (Mathe, Uhrzeit, Badges, Spiele)
- Coin-Balance im Header
- Route: `/erfolge`

### 2. BadgeDisplayComponent (`src/app/components/badge-display/`)
- Grid-Layout aller Badges
- Gruppiert nach Kategorie
- Zeigt Fortschrittsbalken für gesperrte Badges
- Zeigt Verdien-Datum für freigeschaltete Badges
- Zeigt Coin-Belohnung pro Badge

### 3. GameCenterComponent (`src/app/components/game-center/`)
- Listet verfügbare Spiele
- Zeigt High Scores
- "Spielen"-Button mit Coin-Kosten
- Button deaktiviert bei zu wenig Coins

### 4. FlappyFoxComponent (`src/app/components/flappy-fox/`)
- Canvas-basiertes Spiel
- Klassische Flappy Bird Mechanik adaptiert für Fuchs-Charakter
- Touch + Keyboard Controls (Space zum Flattern)
- Score-Anzeige und High Score Tracking
- Game Over Screen mit Neustart-Option (kostet Coins)
- Route: `/spielen/flappy-fox`

### 5. ExerciseAchievementsComponent (`src/app/components/exercise-achievements/`)
- Extrahiert aus aktueller Achievements-Komponente
- Zeigt Medaillen, Streaks, Time Trials für eine Kategorie
- Wiederverwendbar für Mathe/Uhrzeit-Tabs

## Badge-Definitionen (Beispiele)

### Performance Badges
- **Speed Demon** ⚡: Löse 10 Aufgaben in unter 20s gesamt (50 Coins)
- **Perfect Day** 💯: 100% Genauigkeit mit 20+ Aufgaben an einem Tag (100 Coins)
- **Accuracy Expert** 🎯: Halte 95%+ Genauigkeit über 100 Aufgaben (75 Coins)

### Konsistenz Badges
- **7-Day Streak** 🔥: Übe 7 Tage am Stück (75 Coins)
- **30-Day Streak** 🌟: Übe 30 Tage am Stück (300 Coins)
- **100-Day Streak** 💎: Übe 100 Tage am Stück (1000 Coins)
- **Practice Every Day This Week** 📅: 7 aufeinanderfolgende Tage (50 Coins)

### Meilenstein Badges
- **Bronze Collector** 🥉: Erreiche Bronze in allen 5 Aufgabenarten (200 Coins)
- **Silver Collector** 🥈: Erreiche Silber in allen 5 Aufgabenarten (500 Coins)
- **Gold Collector** 🥇: Erreiche Gold in allen 5 Aufgabenarten (1500 Coins)
- **1000 Problems Solved** 🎓: Gesamt richtige Antworten über alle Typen (500 Coins)
- **Time Trial Champion** ⏱️: Erreiche 45+ richtig in einem Time Trial (150 Coins)
- **Multiplication Master** ✖️: Meistere alle 10 Einmaleins-Reihen (400 Coins)

### Challenge Badges
- Reserviert für zukünftiges Daily Challenges Feature

## Coin-Verdien-Regeln

| Event | Verdiente Coins |
|-------|-----------------|
| Richtige Antwort | 1 |
| Mathe-Tagesziel (20) | 10 Bonus |
| Uhrzeit-Tagesziel (20) | 10 Bonus |
| 7-Tage-Streak | 50 |
| 14-Tage-Streak | 100 |
| 30-Tage-Streak | 250 |
| 50-Tage-Streak | 500 |
| 100-Tage-Streak | 1000 |
| Badge verdient | Variabel (50-1500 pro Badge) |

**Durchschnittliche Einnahmen**: ~30-50 Coins pro Übungs-Session (20 richtig + Ziele + gelegentliche Badges)

**Spielkosten**: 100 Coins = 2-3 gute Übungs-Sessions

## Routen

### Neue Routen
```typescript
// Globale Erfolge (ersetzt /mathe/erfolge und /uhrzeit/erfolge)
{ path: 'erfolge', component: GlobalAchievementsComponent, canActivate: [authGuard] }

// Flappy Fox Spiel
{ path: 'spielen/flappy-fox', component: FlappyFoxComponent, canActivate: [authGuard, gameGuard] }

// Redirects für Rückwärtskompatibilität
{ path: 'mathe/erfolge', redirectTo: '/erfolge?tab=math' }
{ path: 'uhrzeit/erfolge', redirectTo: '/erfolge?tab=clock' }
```

### Neuer Guard
```typescript
// gameGuard prüft ob User genug Coins hat vor Spiel-Eintritt
export const gameGuard: CanActivateFn = (route, state) => {
  const coinsService = inject(CoinsService);
  return coinsService.canAfford(100); // Flappy Fox Kosten
};
```

## Coin-Flow Integration

### 1. Richtige Antwort (in StatsService)
```typescript
recordResult(isCorrect: boolean, exerciseType: string) {
  // ... bestehende Logik

  if (isCorrect) {
    await this.coinsService.awardCoins(userId, 1, 'correct_answer', exerciseType);
  }

  // Prüfe Tagesziel-Bonus
  if (this.isGoalReached() && !this.dailyBonusAwarded) {
    await this.coinsService.awardCoins(userId, 10, 'daily_goal');
    this.dailyBonusAwarded = true;
  }
}
```

### 2. Streak Meilenstein (in DailyStreakService)
```typescript
async recordPractice(userId: string) {
  // ... bestehende Streak-Logik

  if (milestoneAchieved) {
    const coinReward = STREAK_COIN_REWARDS[milestoneAchieved];
    await inject(CoinsService).awardCoins(userId, coinReward, 'streak_milestone', String(milestoneAchieved));
  }
}
```

### 3. Badge verdient (in BadgeService)
```typescript
async checkAndAwardBadges(userId: string, data: BadgeCheckData): Promise<Badge[]> {
  const newBadges = /* Prüf-Logik */;

  for (const badge of newBadges) {
    await this.supabase.insertBadge(userId, badge.id);
    await inject(CoinsService).awardCoins(userId, badge.coinReward, 'badge_earned', badge.id);
  }

  return newBadges;
}
```

## Implementierungs-Phasen (5 Wochen)

### Phase 1: Foundation (Woche 1)
1. Erstelle Supabase Migration SQL-Datei
2. Teste Migration lokal
3. Erstelle TypeScript Models (badge, coin, game)
4. Füge Supabase Service Methoden für neue Tabellen hinzu
5. Implementiere CoinsService mit localStorage + Supabase Sync

**Deliverables**: Datenbank bereit, CoinsService funktional

### Phase 2: Badges (Woche 2)
1. Definiere alle Badge-Konfigurationen (20+ Badges)
2. Implementiere BadgeService
3. Erstelle BadgeDisplayComponent UI
4. Integriere Badge-Checks mit StatsService
5. Füge Badge-Benachrichtigungen hinzu

**Deliverables**: Badge-System funktioniert, sichtbar auf neuer Erfolgsseite

### Phase 3: Erfolgsseiten-Refactoring (Woche 3)
1. Erstelle GlobalAchievementsComponent mit Tabs
2. Extrahiere ExerciseAchievementsComponent aus aktueller Komponente
3. Füge Coin-Balance-Anzeige im Header hinzu
4. Update Routen und Redirects
5. Update Navigation-Links in gesamter App

**Deliverables**: Neue `/erfolge` Route funktioniert, alte Routen redirecten

### Phase 4: Spiel-System (Woche 4)
1. Implementiere GameService
2. Erstelle GameCenterComponent
3. Implementiere FlappyFoxComponent mit Canvas
4. Füge Spiel-Physik und Kollisionserkennung hinzu
5. Füge High Score Persistierung hinzu
6. Füge gameGuard für Coin-Prüfung hinzu

**Deliverables**: Spielbares Flappy Fox Spiel zugänglich von Erfolgsseite

### Phase 5: Polish & Launch (Woche 5)
1. Füge Offline Coin Transaction Queue hinzu
2. Führe retroaktive Badge-Prüfung für bestehende User durch
3. Füge Animationen hinzu (Badge Freischaltungen, Coin-Verdienst)
4. Responsive Design für alle Screens
5. Tablet Landscape Optimierungen
6. Testing (Unit, Integration, E2E)

**Deliverables**: Produktionsreifes Gamification-System

## Kritische Dateien

### Backend/Datenbank
1. `supabase-schema.sql` - Neue Tabellen hinzufügen
2. `src/app/services/supabase.service.ts` - Methoden für neue Tabellen

### Models
3. `src/app/models/badge.model.ts` - NEU erstellen
4. `src/app/models/coin.model.ts` - NEU erstellen
5. `src/app/models/game.model.ts` - NEU erstellen

### Services
6. `src/app/services/badge.service.ts` - NEU erstellen
7. `src/app/services/coins.service.ts` - NEU erstellen
8. `src/app/services/game.service.ts` - NEU erstellen
9. `src/app/services/stats.service.ts` - Coin-Integration
10. `src/app/services/daily-streak.service.ts` - Coin-Integration

### Komponenten
11. `src/app/components/global-achievements/` - NEU erstellen
12. `src/app/components/badge-display/` - NEU erstellen
13. `src/app/components/game-center/` - NEU erstellen
14. `src/app/components/flappy-fox/` - NEU erstellen
15. `src/app/components/exercise-achievements/` - Extrahiert aus achievements

### Routing
16. `src/app/app.routes.ts` - Neue Routen, Redirects
17. `src/app/guards/game.guard.ts` - NEU erstellen

### Header/Navigation
18. `src/app/components/user-profile/user-profile.component.ts` - Coin-Balance anzeigen
19. `src/app/app.ts` - Navigation zu `/erfolge` aktualisieren

## Flappy Fox Game Details

### Gameplay
- Fuchs startet in der Mitte des Bildschirms
- Space/Touch zum Flattern (Aufwärtsbewegung)
- Gravity zieht Fuchs nach unten
- Pipes erscheinen von rechts, bewegen sich nach links
- Kollision mit Pipe oder Boden = Game Over
- +1 Punkt pro durchflogener Pipe
- Schwierigkeit steigt: Pipes kommen schneller nach 10, 20, 30 Punkten

### Technische Implementierung
- **Canvas API** (nicht SVG oder Library)
- **requestAnimationFrame** für 60 FPS
- **Object Pooling** für Pipes (Wiederverwendung)
- **Collision Detection**: Bounding Box Check
- **State Machine**: READY → PLAYING → GAME_OVER

### Visuals
- Fuchs: Emoji 🦊 oder einfaches SVG
- Pipes: Grüne Rechtecke (wie Original)
- Hintergrund: Einfarbig oder Gradient
- Score: Großer weißer Text oben-mitte
- High Score: Kleiner Text oben-rechts

### Controls
- **Desktop**: Space-Taste zum Flattern
- **Mobile**: Tap/Touch auf Canvas
- **Pause**: Escape-Taste (optional)

### Scoring
- High Score per User gespeichert
- Anzeige auf Game Over Screen
- "New High Score!" Celebration wenn übertroffen

## Verification / Testing

### Manual Testing Checklist

**Badge System**:
- [ ] Löse 10 Aufgaben in unter 20s → "Speed Demon" Badge erscheint
- [ ] Erreiche 100% mit 20 Aufgaben → "Perfect Day" Badge
- [ ] 7 Tage in Folge üben → "7-Day Streak" Badge
- [ ] Erreiche Bronze in allen 5 Typen → "Bronze Collector" Badge
- [ ] Badge-Fortschritt wird korrekt angezeigt (z.B. 7/10 für Speed Demon)
- [ ] Verdiente Badges zeigen Datum
- [ ] Badges sind nach Kategorie gruppiert

**Coins System**:
- [ ] Richtige Antwort → +1 Coin
- [ ] Tagesziel erreicht → +10 Coins Bonus (nur einmal pro Tag)
- [ ] Badge verdient → Coins gemäß Badge-Reward
- [ ] Streak-Meilenstein → Entsprechende Coins
- [ ] Coin-Balance im Header sichtbar
- [ ] Offline-Transaktionen werden bei Reconnect synct

**Erfolgsseite**:
- [ ] `/erfolge` zeigt Tabs: Mathe, Uhrzeit, Badges, Spiele
- [ ] Mathe-Tab zeigt Mathe-Medaillen, Streaks, Time Trials
- [ ] Uhrzeit-Tab zeigt Uhrzeit-Medaillen, Streaks, Time Trials
- [ ] Badges-Tab zeigt alle 20+ Badges
- [ ] Spiele-Tab zeigt Flappy Fox mit High Score
- [ ] `/mathe/erfolge` redirectet zu `/erfolge?tab=math`
- [ ] `/uhrzeit/erfolge` redirectet zu `/erfolge?tab=clock`

**Flappy Fox**:
- [ ] Spiel kostet 100 Coins
- [ ] Button deaktiviert wenn < 100 Coins
- [ ] Space-Taste lässt Fuchs flattern
- [ ] Touch/Tap funktioniert auf Mobile
- [ ] Kollision mit Pipe → Game Over
- [ ] Score wird korrekt gezählt
- [ ] High Score wird gespeichert und angezeigt
- [ ] "New High Score!" erscheint bei Rekord
- [ ] Neustart kostet erneut 100 Coins

**Supabase Sync**:
- [ ] Badges synct zu `user_badges` Tabelle
- [ ] Coin-Balance synct zu `coin_balances`
- [ ] Transaktionen in `coin_transactions` sichtbar
- [ ] Game Score synct zu `game_scores`
- [ ] User-Wechsel lädt korrekte Daten

**Retroactive Badges**:
- [ ] Bestehende User bekommen automatisch verdiente Badges
- [ ] Retroaktive Coins werden gutgeschrieben
- [ ] Keine Duplikat-Badges

## Performance Optimizations

### Badge Checking
- **Debounce**: Prüfe Badges alle 5 Antworten, nicht bei jeder Antwort
- **Cache**: Speichere Fortschritt in Memory Signals
- **Lazy Load**: Lade nur beim Achievements-Page Mount

### Game Performance
- **Canvas**: requestAnimationFrame für smooth 60 FPS
- **Object Pooling**: Wiederverwendung von Pipe-Objekten
- **Minimal Rendering**: Nur sichtbare Game-Objekte rendern

### Offline Support
- **Queue Transactions**: Speichere Coin-Transaktionen in Array wenn offline
- **Sync on Reconnect**: Flush Queue bei Verbindungs-Wiederherstellung
- **Optimistic Updates**: Update UI sofort, Sync im Hintergrund

## Offen / Zu Klären

1. **Badge Icons**: Emojis oder custom SVG? → **Empfehlung: Emojis** (keine Assets nötig)
2. **Coin Animation**: Sollen Coins zum Header-Balance "fliegen" wenn verdient? → **Optional für Phase 5**
3. **Badge Notifications**: Toast, Modal oder Badge-Icon im Header? → **Empfehlung: Toast**
4. **Game Difficulty**: Pipe-Speed über Zeit erhöhen in Flappy Fox? → **Ja, nach 10/20/30 Punkten**
5. **Retroactive Coins**: Wie viele Coins bekommen bestehende User initial? → **Nur durch retroaktive Badges**
