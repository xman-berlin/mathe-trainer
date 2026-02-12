# Gamification System: Badge System, Coins & Flappy Fox

## Overview

Implementation of a comprehensive gamification system for Schlaufuchs:
- **Badge System**: 20+ badges in 4 categories (Performance, Consistency, Milestones, Challenges)
- **Global Achievements Page**: Unified `/erfolge` route with tabs (Math, Clock, Badges, Games)
- **Coins System**: Virtual currency with localStorage + Supabase sync
- **Flappy Fox Game**: Canvas-based reward game for 100 coins

## Task List

### Phase 1: Foundation
- [x] Create Supabase migration (user_badges, coin_balances, coin_transactions, game_scores)
- [x] Create TypeScript models (badge.model.ts, coin.model.ts, game.model.ts)
- [x] Extend SupabaseService

### Phase 2: Badge & Coins System
- [x] Implement CoinsService (localStorage + Supabase sync, offline queue)
- [x] Implement BadgeService (22 badge definitions, 4 categories)
- [x] Coin integration in StatsService (1 coin per correct answer, 10 for daily goal)
- [x] Coin integration in DailyStreakService (streak milestones)
- [x] Extend AuthService (load coins/badges on login)
- [x] Create BadgeDisplayComponent

### Phase 3: Global Achievements
- [x] Create GlobalAchievementsComponent with tabs
- [x] Update routing (/erfolge as main route)
- [x] Refactor AchievementsComponent as @Input
- [x] Homepage achievements card with coins display
- [x] Integrate stats in category cards

### Phase 4: Flappy Fox Game
- [x] Implement GameService
- [x] Create FlappyFoxComponent (canvas-based)
- [x] Touch + keyboard controls
- [x] Coin cost (100) and high score persistence
- [x] Populate games tab in GlobalAchievements

### Phase 5: Three Additional Mini-Games
- [x] Extend game.model.ts (DINO_RUN_CONFIG, BREAKOUT_CONFIG, BALLOON_POP_CONFIG)
- [x] Extend game.service.ts (add 3 games to AVAILABLE_GAMES)
- [x] Implement Dino Run (endless runner with obstacles)
- [x] Implement Breakout (ball against blocks)
- [x] Implement Balloon Pop (math quiz with balloons)
- [x] Extend app.routes.ts (3 new routes)
- [x] Lint and build verification

## Architecture Decisions

### 1. Badge Data Model
- Badge definitions as TypeScript constants
- Progress calculated from existing stats (no redundant storage)
- Only earned badges stored in new `user_badges` table

### 2. Coins Architecture
- Central **CoinsService** (not integrated into StatsService)
- Transaction history for debugging
- Offline support with transaction queue

### 3. Achievements Page
- **Single global page** at `/erfolge` with tabs
- Tabs: Math | Clock | Badges | Games
- No code duplication
- Coin balance visible in header

### 4. Flappy Fox Implementation
- Canvas-based with separate route `/spielen/flappy-fox`
- Classic Flappy Bird gameplay
- Touch + keyboard controls (Space to flap)
- 100 coins cost per game
- High score persistence per user

## Data Models

### New Supabase Tables

```sql
-- Stores earned badges per user
CREATE TABLE user_badges (
  user_id UUID REFERENCES users(id),
  badge_id TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(user_id, badge_id)
);

-- Stores coin balance per user
CREATE TABLE coin_balances (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction log for auditing
CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  amount INTEGER, -- Positive = earned, Negative = spent
  reason TEXT, -- 'correct_answer', 'badge_earned', 'game_cost', etc.
  related_id TEXT, -- badge_id, exercise_type, game_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game scores per user per game
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

## New Services

### BadgeService (`src/app/services/badge.service.ts`)
**Responsibilities**:
- Defines all badge configurations
- Checks badge eligibility
- Awards badges and triggers coin rewards
- Syncs to Supabase

**Key Methods**:
```typescript
loadEarnedBadges(userId: string): Promise<void>
checkAndAwardBadges(userId: string, data: BadgeCheckData): Promise<Badge[]>
getBadgeProgress(badgeId: string): { current: number; required: number }
isBadgeEarned(badgeId: string): boolean
```

### CoinsService (`src/app/services/coins.service.ts`)
**Responsibilities**:
- Manages coin balance signal
- Records transactions
- Awards/spends coins with validation
- Syncs to Supabase
- Queue for offline transactions

**Key Methods**:
```typescript
loadBalance(userId: string): Promise<void>
awardCoins(userId: string, amount: number, reason: string, relatedId?: string): Promise<void>
spendCoins(userId: string, amount: number, reason: string, relatedId?: string): Promise<void>
canAfford(amount: number): boolean
```

### GameService (`src/app/services/game.service.ts`)
**Responsibilities**:
- Manages available games
- Handles game sessions (coin deduction)
- Saves and loads high scores

**Key Methods**:
```typescript
loadScores(userId: string): Promise<void>
startGame(userId: string, gameId: string): Promise<void>
saveScore(userId: string, gameId: string, score: number): Promise<boolean>
getHighScore(gameId: string): number
```

## New Components

### 1. GlobalAchievementsComponent (`src/app/components/global-achievements/`)
- Unified achievements page
- Tab navigation (Math, Clock, Badges, Games)
- Coin balance in header
- Route: `/erfolge`

### 2. BadgeDisplayComponent (`src/app/components/badge-display/`)
- Grid layout of all badges
- Grouped by category
- Shows progress bar for locked badges
- Shows earned date for unlocked badges
- Shows coin reward per badge

### 3. GameCenterComponent (`src/app/components/game-center/`)
- Lists available games
- Shows high scores
- "Play" button with coin cost
- Button disabled when insufficient coins

### 4. FlappyFoxComponent (`src/app/components/flappy-fox/`)
- Canvas-based game
- Classic Flappy Bird mechanics adapted for fox character
- Touch + keyboard controls (Space to flap)
- Score display and high score tracking
- Game over screen with restart option (costs coins)
- Route: `/spielen/flappy-fox`

### 5. ExerciseAchievementsComponent (`src/app/components/exercise-achievements/`)
- Extracted from current achievements component
- Shows medals, streaks, time trials for one category
- Reusable for Math/Clock tabs

## Badge Definitions (Examples)

### Performance Badges
- **Speed Demon** ⚡: Solve 10 problems in under 20s total (50 Coins)
- **Perfect Day** 💯: 100% accuracy with 20+ problems in one day (100 Coins)
- **Accuracy Expert** 🎯: Maintain 95%+ accuracy over 100 problems (75 Coins)

### Consistency Badges
- **7-Day Streak** 🔥: Practice 7 days in a row (75 Coins)
- **30-Day Streak** 🌟: Practice 30 days in a row (300 Coins)
- **100-Day Streak** 💎: Practice 100 days in a row (1000 Coins)
- **Practice Every Day This Week** 📅: 7 consecutive days (50 Coins)

### Milestone Badges
- **Bronze Collector** 🥉: Achieve bronze in all 5 exercise types (200 Coins)
- **Silver Collector** 🥈: Achieve silver in all 5 exercise types (500 Coins)
- **Gold Collector** 🥇: Achieve gold in all 5 exercise types (1500 Coins)
- **1000 Problems Solved** 🎓: Total correct answers across all types (500 Coins)
- **Time Trial Champion** ⏱️: Achieve 45+ correct in one time trial (150 Coins)
- **Multiplication Master** ✖️: Master all 10 multiplication tables (400 Coins)

### Challenge Badges
- Reserved for future daily challenges feature

## Coin Earning Rules

| Event | Coins Earned |
|-------|--------------|
| Correct answer | 1 |
| Math daily goal (20) | 10 Bonus |
| Clock daily goal (20) | 10 Bonus |
| 7-day streak | 50 |
| 14-day streak | 100 |
| 30-day streak | 250 |
| 50-day streak | 500 |
| 100-day streak | 1000 |
| Badge earned | Variable (50-1500 per badge) |

**Average earnings**: ~30-50 coins per practice session (20 correct + goals + occasional badges)

**Game cost**: 100 coins = 2-3 good practice sessions

## Routes

### New Routes
```typescript
// Global achievements (replaces /mathe/erfolge and /uhrzeit/erfolge)
{ path: 'erfolge', component: GlobalAchievementsComponent, canActivate: [authGuard] }

// Flappy Fox game
{ path: 'spielen/flappy-fox', component: FlappyFoxComponent, canActivate: [authGuard, gameGuard] }

// Redirects for backwards compatibility
{ path: 'mathe/erfolge', redirectTo: '/erfolge?tab=math' }
{ path: 'uhrzeit/erfolge', redirectTo: '/erfolge?tab=clock' }
```

### New Guard
```typescript
// gameGuard checks if user has enough coins before game entry
export const gameGuard: CanActivateFn = (route, state) => {
  const coinsService = inject(CoinsService);
  return coinsService.canAfford(100); // Flappy Fox cost
};
```

## Coin Flow Integration

### 1. Correct Answer (in StatsService)
```typescript
recordResult(isCorrect: boolean, exerciseType: string) {
  // ... existing logic

  if (isCorrect) {
    await this.coinsService.awardCoins(userId, 1, 'correct_answer', exerciseType);
  }

  // Check daily goal bonus
  if (this.isGoalReached() && !this.dailyBonusAwarded) {
    await this.coinsService.awardCoins(userId, 10, 'daily_goal');
    this.dailyBonusAwarded = true;
  }
}
```

### 2. Streak Milestone (in DailyStreakService)
```typescript
async recordPractice(userId: string) {
  // ... existing streak logic

  if (milestoneAchieved) {
    const coinReward = STREAK_COIN_REWARDS[milestoneAchieved];
    await inject(CoinsService).awardCoins(userId, coinReward, 'streak_milestone', String(milestoneAchieved));
  }
}
```

### 3. Badge Earned (in BadgeService)
```typescript
async checkAndAwardBadges(userId: string, data: BadgeCheckData): Promise<Badge[]> {
  const newBadges = /* Check logic */;

  for (const badge of newBadges) {
    await this.supabase.insertBadge(userId, badge.id);
    await inject(CoinsService).awardCoins(userId, badge.coinReward, 'badge_earned', badge.id);
  }

  return newBadges;
}
```

## Implementation Phases (5 Weeks)

### Phase 1: Foundation (Week 1)
1. Create Supabase migration SQL file
2. Test migration locally
3. Create TypeScript models (badge, coin, game)
4. Add Supabase service methods for new tables
5. Implement CoinsService with localStorage + Supabase sync

**Deliverables**: Database ready, CoinsService functional

### Phase 2: Badges (Week 2)
1. Define all badge configurations (20+ badges)
2. Implement BadgeService
3. Create BadgeDisplayComponent UI
4. Integrate badge checks with StatsService
5. Add badge notifications

**Deliverables**: Badge system works, visible on new achievements page

### Phase 3: Achievements Page Refactoring (Week 3)
1. Create GlobalAchievementsComponent with tabs
2. Extract ExerciseAchievementsComponent from current component
3. Add coin balance display in header
4. Update routes and redirects
5. Update navigation links throughout app

**Deliverables**: New `/erfolge` route works, old routes redirect

### Phase 4: Game System (Week 4)
1. Implement GameService
2. Create GameCenterComponent
3. Implement FlappyFoxComponent with canvas
4. Add game physics and collision detection
5. Add high score persistence
6. Add gameGuard for coin check

**Deliverables**: Playable Flappy Fox game accessible from achievements page

### Phase 5: Polish & Launch (Week 5)
1. Add offline coin transaction queue
2. Perform retroactive badge check for existing users
3. Add animations (badge unlocks, coin earnings)
4. Responsive design for all screens
5. Tablet landscape optimizations
6. Testing (unit, integration, E2E)

**Deliverables**: Production-ready gamification system

## Critical Files

### Backend/Database
1. `supabase-schema.sql` - Add new tables
2. `src/app/services/supabase.service.ts` - Methods for new tables

### Models
3. `src/app/models/badge.model.ts` - NEW create
4. `src/app/models/coin.model.ts` - NEW create
5. `src/app/models/game.model.ts` - NEW create

### Services
6. `src/app/services/badge.service.ts` - NEW create
7. `src/app/services/coins.service.ts` - NEW create
8. `src/app/services/game.service.ts` - NEW create
9. `src/app/services/stats.service.ts` - Coin integration
10. `src/app/services/daily-streak.service.ts` - Coin integration

### Components
11. `src/app/components/global-achievements/` - NEW create
12. `src/app/components/badge-display/` - NEW create
13. `src/app/components/game-center/` - NEW create
14. `src/app/components/flappy-fox/` - NEW create
15. `src/app/components/exercise-achievements/` - Extracted from achievements

### Routing
16. `src/app/app.routes.ts` - New routes, redirects
17. `src/app/guards/game.guard.ts` - NEW create

### Header/Navigation
18. `src/app/components/user-profile/user-profile.component.ts` - Display coin balance
19. `src/app/app.ts` - Update navigation to `/erfolge`

## Flappy Fox Game Details

### Gameplay
- Fox starts in the middle of the screen
- Space/Touch to flap (upward movement)
- Gravity pulls fox downward
- Pipes appear from right, move to left
- Collision with pipe or ground = Game Over
- +1 point per pipe passed
- Difficulty increases: Pipes come faster after 10, 20, 30 points

### Technical Implementation
- **Canvas API** (not SVG or library)
- **requestAnimationFrame** for 60 FPS
- **Object Pooling** for pipes (reuse)
- **Collision Detection**: Bounding box check
- **State Machine**: READY → PLAYING → GAME_OVER

### Visuals
- Fox: Emoji 🦊 or simple SVG
- Pipes: Green rectangles (like original)
- Background: Solid color or gradient
- Score: Large white text top-center
- High Score: Small text top-right

### Controls
- **Desktop**: Space key to flap
- **Mobile**: Tap/Touch on canvas
- **Pause**: Escape key (optional)

### Scoring
- High score saved per user
- Display on game over screen
- "New High Score!" celebration when beaten

## Verification / Testing

### Manual Testing Checklist

**Badge System**:
- [ ] Solve 10 problems in under 20s → "Speed Demon" badge appears
- [ ] Achieve 100% with 20 problems → "Perfect Day" badge
- [ ] Practice 7 days in a row → "7-Day Streak" badge
- [ ] Achieve bronze in all 5 types → "Bronze Collector" badge
- [ ] Badge progress displayed correctly (e.g., 7/10 for Speed Demon)
- [ ] Earned badges show date
- [ ] Badges grouped by category

**Coins System**:
- [ ] Correct answer → +1 coin
- [ ] Daily goal reached → +10 coins bonus (once per day)
- [ ] Badge earned → Coins according to badge reward
- [ ] Streak milestone → Corresponding coins
- [ ] Coin balance visible in header
- [ ] Offline transactions synced on reconnect

**Achievements Page**:
- [ ] `/erfolge` shows tabs: Math, Clock, Badges, Games
- [ ] Math tab shows math medals, streaks, time trials
- [ ] Clock tab shows clock medals, streaks, time trials
- [ ] Badges tab shows all 20+ badges
- [ ] Games tab shows Flappy Fox with high score
- [ ] `/mathe/erfolge` redirects to `/erfolge?tab=math`
- [ ] `/uhrzeit/erfolge` redirects to `/erfolge?tab=clock`

**Flappy Fox**:
- [ ] Game costs 100 coins
- [ ] Button disabled when < 100 coins
- [ ] Space key makes fox flap
- [ ] Touch/Tap works on mobile
- [ ] Collision with pipe → Game Over
- [ ] Score counted correctly
- [ ] High score saved and displayed
- [ ] "New High Score!" appears when beaten
- [ ] Restart costs 100 coins again

**Supabase Sync**:
- [ ] Badges synced to `user_badges` table
- [ ] Coin balance synced to `coin_balances`
- [ ] Transactions visible in `coin_transactions`
- [ ] Game score synced to `game_scores`
- [ ] User switch loads correct data

**Retroactive Badges**:
- [ ] Existing users automatically get earned badges
- [ ] Retroactive coins credited
- [ ] No duplicate badges

## Performance Optimizations

### Badge Checking
- **Debounce**: Check badges every 5 answers, not every answer
- **Cache**: Store progress in memory signals
- **Lazy Load**: Load only on achievements page mount

### Game Performance
- **Canvas**: requestAnimationFrame for smooth 60 FPS
- **Object Pooling**: Reuse pipe objects
- **Minimal Rendering**: Render only visible game objects

### Offline Support
- **Queue Transactions**: Store coin transactions in array when offline
- **Sync on Reconnect**: Flush queue on connection restoration
- **Optimistic Updates**: Update UI immediately, sync in background

## Open / To Clarify

1. **Badge Icons**: Emojis or custom SVG? → **Recommendation: Emojis** (no assets needed)
2. **Coin Animation**: Should coins "fly" to header balance when earned? → **Optional for Phase 5**
3. **Badge Notifications**: Toast, modal or badge icon in header? → **Recommendation: Toast**
4. **Game Difficulty**: Increase pipe speed over time in Flappy Fox? → **Yes, after 10/20/30 points**
5. **Retroactive Coins**: How many coins do existing users get initially? → **Only through retroactive badges**

## TODO / Future Refactoring

- [ ] **Switch ExerciseComponent to ProblemGeneratorService**: Problem generation in `exercise.component.ts` should use the new `ProblemGeneratorService` (as already implemented in `BalloonPopComponent`)
