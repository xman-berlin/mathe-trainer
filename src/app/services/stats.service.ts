import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { DailyStreakService } from './daily-streak.service';
import { CoinsService } from './coins.service';
import { BadgeService } from './badge.service';
import {
  PracticeCategory,
  catalogDefaults,
  clampDailyGoal,
  correctCountForCategory,
  correctCountForTile,
  cappedCorrectCountForCategory,
  allTileGoalsReached,
  findTileById,
  mergeGoalsWithDefaults,
  sumGoalsForCategory,
  tilesForCategory,
} from '../models/practice-exercise.catalog';

interface ExerciseTypeStats {
  correct: number;
  incorrect: number;
}

interface DailyStats {
  date: string;
  correct?: number; // Deprecated, kept for backward compatibility
  incorrect?: number; // Deprecated, kept for backward compatibility
  byType: Record<string, ExerciseTypeStats>;
  dailyGoal?: number; // Optional for backward compatibility
  clockDailyGoal?: number; // Optional for backward compatibility
  vocabDailyGoal?: number;
  englischDailyGoal?: number;
  goalsByExercise?: Record<string, number>;
}

interface LifetimeStats {
  byType: Record<string, number>; // Cumulative correct answers per type
  best_streaks_by_type?: Record<string, number>; // Best streaks per type
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly storageKey = 'schlaufuchs-stats';
  private readonly lifetimeStorageKey = 'schlaufuchs-lifetime-stats';
  private readonly numberRangeStorageKey = 'schlaufuchs-number-range';
  private readonly goalsStorageKey = 'schlaufuchs-daily-goals-by-exercise';

  // Server sync dependencies - not optional, circular dep resolved by lazy loading
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private streakService = inject(DailyStreakService);
  private coinsService = inject(CoinsService);
  private badgeService = inject(BadgeService);
  private hasAnsweredToday = signal(false);

  // Track answers for badge checking (debounce every 5 answers)
  private answerCounter = 0;
  private mathGoalBonusAwarded = signal(false);
  private clockGoalBonusAwarded = signal(false);
  private deutschGoalBonusAwarded = signal(false);
  private englischGoalBonusAwarded = signal(false);

  private date = signal(this.today());
  private byType = signal<Record<string, ExerciseTypeStats>>({});
  private goalsByExercise = signal<Record<string, number>>(catalogDefaults());
  private mathNumberRange = signal(100); // Default number range for math exercises
  private lifetimeByType = signal<Record<string, number>>({});
  private bestStreaksByTypeSignal = signal<Record<string, number>>({});

  // Math exercise types
  private readonly mathTypes = ['addition', 'subtraction', 'multiplication', 'division', 'word-problems'];
  // Clock exercise types
  private readonly clockTypes = ['clock-full', 'clock-half', 'clock-quarter', 'clock-fiveMin', 'clock-setClock-full', 'clock-setClock-half', 'clock-setClock-quarter', 'clock-setClock-fiveMin', 'clock-setClock-fiveMinAfter', 'clock-setClock-fiveMinBefore', 'clock-setClock-fiveMinHalf', 'clock-zeitspanne', 'clock-verspaetung'];

  readonly statsByType = this.byType.asReadonly();
  readonly goalsByExerciseMap = this.goalsByExercise.asReadonly();
  readonly lifetimeStatsByType = this.lifetimeByType.asReadonly();
  readonly currentMathNumberRange = this.mathNumberRange.asReadonly();

  // Math-specific stats
  readonly mathCorrectCount = computed(() => {
    const types = this.byType();
    let total = 0;
    for (const type of this.mathTypes) {
      total += types[type]?.correct ?? 0;
    }
    return total;
  });

  readonly mathIncorrectCount = computed(() => {
    const types = this.byType();
    let total = 0;
    for (const type of this.mathTypes) {
      total += types[type]?.incorrect ?? 0;
    }
    return total;
  });

  /** Category roll-up goal (sum of per-tile goals) */
  readonly currentGoal = computed(() => this.categoryGoalSum('math'));
  readonly goalProgressPercent = computed(() => {
    const goal = this.currentGoal();
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((this.categoryCorrectSum('math') / goal) * 100));
  });
  readonly isGoalReached = computed(() => this.isCategoryGoalReached('math'));

  // Clock-specific stats
  readonly clockCorrectCount = computed(() => {
    const types = this.byType();
    let total = 0;
    for (const type of this.clockTypes) {
      total += types[type]?.correct ?? 0;
    }
    return total;
  });

  readonly clockIncorrectCount = computed(() => {
    const types = this.byType();
    let total = 0;
    for (const type of this.clockTypes) {
      total += types[type]?.incorrect ?? 0;
    }
    return total;
  });

  readonly currentClockGoal = computed(() => this.categoryGoalSum('clock'));
  readonly clockGoalProgressPercent = computed(() => {
    const goal = this.currentClockGoal();
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((this.categoryCorrectSum('clock') / goal) * 100));
  });
  readonly isClockGoalReached = computed(() => this.isCategoryGoalReached('clock'));
  readonly bestStreaksByType = this.bestStreaksByTypeSignal.asReadonly();

  // Deutsch-specific stats (includes hangman for badges; goals exclude hangman via catalog)
  readonly deutschCorrectCount = computed(() => {
    const types = this.byType();
    let total = 0;
    for (const [type, stats] of Object.entries(types)) {
      if (type.startsWith('deutsch-')) {
        total += stats.correct ?? 0;
      }
    }
    return total;
  });

  readonly deutschIncorrectCount = computed(() => {
    const types = this.byType();
    let total = 0;
    for (const [type, stats] of Object.entries(types)) {
      if (type.startsWith('deutsch-')) {
        total += stats.incorrect ?? 0;
      }
    }
    return total;
  });

  readonly currentDeutschGoal = computed(() => this.categoryGoalSum('deutsch'));
  readonly deutschGoalProgressPercent = computed(() => {
    const goal = this.currentDeutschGoal();
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((this.categoryCorrectSum('deutsch') / goal) * 100));
  });
  readonly isDeutschGoalReached = computed(() => this.isCategoryGoalReached('deutsch'));

  // Englisch-specific stats (exercise type: 'englisch-uebersetzung')
  readonly englischCorrectCount = computed(() => {
    const types = this.byType();
    let total = 0;
    for (const [type, stats] of Object.entries(types)) {
      if (type.startsWith('englisch-')) {
        total += stats.correct ?? 0;
      }
    }
    return total;
  });

  readonly englischIncorrectCount = computed(() => {
    const types = this.byType();
    let total = 0;
    for (const [type, stats] of Object.entries(types)) {
      if (type.startsWith('englisch-')) {
        total += stats.incorrect ?? 0;
      }
    }
    return total;
  });

  readonly currentEnglischGoal = computed(() => this.categoryGoalSum('englisch'));
  readonly englischGoalProgressPercent = computed(() => {
    const goal = this.currentEnglischGoal();
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((this.categoryCorrectSum('englisch') / goal) * 100));
  });
  readonly isEnglischGoalReached = computed(() => this.isCategoryGoalReached('englisch'));

  constructor() {
    this.load();
    this.loadLifetime();
    this.loadGoalsFromStorage();

    // Load from server if authenticated
    this.loadFromServerIfAuthenticated();
  }

  goalFor(exerciseId: string): number {
    const tile = findTileById(exerciseId);
    return this.goalsByExercise()[exerciseId] ?? tile?.defaultDailyGoal ?? 1;
  }

  correctFor(exerciseId: string): number {
    const tile = findTileById(exerciseId);
    if (!tile) return 0;
    return correctCountForTile(this.byType(), tile);
  }

  isExerciseGoalReached(exerciseId: string): boolean {
    return this.correctFor(exerciseId) >= this.goalFor(exerciseId);
  }

  categoryGoalSum(category: PracticeCategory): number {
    return sumGoalsForCategory(this.goalsByExercise(), category);
  }

  /**
   * Capped correct count for category progress (overflow on one tile does not
   * fill another tile's share of the roll-up).
   */
  categoryCorrectSum(category: PracticeCategory): number {
    return cappedCorrectCountForCategory(this.byType(), this.goalsByExercise(), category);
  }

  /** Raw uncapped correct across goal tiles (diagnostics / badges). */
  categoryRawCorrectSum(category: PracticeCategory): number {
    return correctCountForCategory(this.byType(), category);
  }

  isCategoryGoalReached(category: PracticeCategory): boolean {
    return allTileGoalsReached(this.byType(), this.goalsByExercise(), category);
  }

  setExerciseGoal(exerciseId: string, count: number): void {
    if (!findTileById(exerciseId)) return;
    this.goalsByExercise.set({
      ...this.goalsByExercise(),
      [exerciseId]: clampDailyGoal(count),
    });
    this.persistGoals();
    this.persist();
    this.syncGoalsToServer();
  }

  /** Replace goals for one category (modal save). Other categories unchanged. */
  setGoalsForCategory(category: PracticeCategory, values: Record<string, number>): void {
    const next = { ...this.goalsByExercise() };
    for (const tile of tilesForCategory(category)) {
      if (values[tile.id] !== undefined) {
        next[tile.id] = clampDailyGoal(values[tile.id]);
      }
    }
    this.goalsByExercise.set(next);
    this.persistGoals();
    this.persist();
    this.syncGoalsToServer();
  }

  recordResult(isCorrect: boolean, exerciseType = 'addition') {
    this.ensureToday();

    // Update by type (immutable update to avoid mutating signal value)
    const current = this.byType();
    const typeStats = current[exerciseType] ?? { correct: 0, incorrect: 0 };
    this.byType.set({
      ...current,
      [exerciseType]: {
        correct: typeStats.correct + (isCorrect ? 1 : 0),
        incorrect: typeStats.incorrect + (isCorrect ? 0 : 1)
      }
    });

    // Update lifetime stats for correct answers
    if (isCorrect) {
      const lifetimeCurrent = this.lifetimeByType();
      this.lifetimeByType.set({
        ...lifetimeCurrent,
        [exerciseType]: (lifetimeCurrent[exerciseType] ?? 0) + 1
      });
      this.persistLifetime();

      // Always check and update streak on correct answers
      // The StreakService will handle "already practiced today" logic
      this.updateStreak();

      // Award coin for correct answer
      this.awardCoinForCorrectAnswer(exerciseType);

      // Check and award daily goal bonus
      this.checkDailyGoalBonus(exerciseType);

      // Increment answer counter and check badges periodically
      this.answerCounter++;
      if (this.answerCounter % 5 === 0) {
        this.checkBadges();
      }
    }

    this.persist();

    // Sync to server in background (non-blocking)
    this.syncToServer();
  }

  /**
   * Legacy API: distribute a category total across that category's tiles
   * proportional to catalog defaults (keeps sum ≈ count).
   */
  setDailyGoal(count: number): void {
    this.distributeCategoryGoal('math', count);
  }

  setClockDailyGoal(count: number): void {
    this.distributeCategoryGoal('clock', count);
  }

  setDeutschDailyGoal(count: number): void {
    this.distributeCategoryGoal('deutsch', count);
  }

  setEnglischDailyGoal(count: number): void {
    this.distributeCategoryGoal('englisch', count);
  }

  private distributeCategoryGoal(category: PracticeCategory, count: number): void {
    const tiles = tilesForCategory(category);
    if (tiles.length === 0) return;
    // Minimum achievable sum is 1 per tile
    const total = Math.max(tiles.length, clampDailyGoal(count));
    const defaultSum = tiles.reduce((s, t) => s + t.defaultDailyGoal, 0);
    const values: Record<string, number> = {};
    let assigned = 0;
    tiles.forEach((tile, index) => {
      if (index === tiles.length - 1) {
        values[tile.id] = Math.max(1, total - assigned);
      } else {
        const remainingSlots = tiles.length - index - 1;
        const ideal = Math.max(1, Math.round((total * tile.defaultDailyGoal) / defaultSum));
        const capped = Math.min(ideal, Math.max(1, total - assigned - remainingSlots));
        values[tile.id] = capped;
        assigned += capped;
      }
    });
    this.setGoalsForCategory(category, values);
  }

  setMathNumberRange(value: number): void {
    if (value < 100) value = 100;
    this.mathNumberRange.set(value);
    try {
      localStorage.setItem(this.numberRangeStorageKey, String(value));
    } catch {
      // ignore storage errors
    }
    this.syncGoalsToServer();
  }

  resetToday() {
    const today = this.today();
    this.date.set(today);
    this.byType.set({});
    this.mathGoalBonusAwarded.set(false);
    this.clockGoalBonusAwarded.set(false);
    this.deutschGoalBonusAwarded.set(false);
    this.englischGoalBonusAwarded.set(false);
    // Goals are user preferences — preserved across days
    this.persist();
  }

  private today(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private ensureToday() {
    if (this.date() !== this.today()) {
      this.resetToday();
    }
  }

  private loadGoalsFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.goalsStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, number>;
        this.goalsByExercise.set(mergeGoalsWithDefaults(parsed));
        return;
      }
    } catch {
      // fall through to defaults
    }
    this.goalsByExercise.set(catalogDefaults());
  }

  private persistGoals(): void {
    try {
      localStorage.setItem(this.goalsStorageKey, JSON.stringify(this.goalsByExercise()));
    } catch {
      // ignore storage errors
    }
  }

  private load() {
    try {
      // Load number range from its own key
      const rangeRaw = localStorage.getItem(this.numberRangeStorageKey);
      if (rangeRaw) {
        const parsed = parseInt(rangeRaw, 10);
        if (!isNaN(parsed) && parsed >= 100) {
          this.mathNumberRange.set(parsed);
        }
      }

      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        this.persist();
        return;
      }
      const parsed: DailyStats = JSON.parse(raw);
      if (parsed.date !== this.today()) {
        this.resetToday();
        return;
      }
      this.date.set(parsed.date);
      // Only load if it has the new byType structure
      if (parsed.byType && Object.keys(parsed.byType).length > 0) {
        this.byType.set(parsed.byType);
        if (parsed.goalsByExercise) {
          this.goalsByExercise.set(mergeGoalsWithDefaults(parsed.goalsByExercise));
          this.persistGoals();
        }
      } else {
        // Old format detected, reset to start fresh with new structure
        this.resetToday();
      }
    } catch {
      this.resetToday();
    }
  }

  private persist() {
    const payload: DailyStats = {
      date: this.date(),
      byType: this.byType(),
      dailyGoal: this.currentGoal(),
      clockDailyGoal: this.currentClockGoal(),
      vocabDailyGoal: this.currentDeutschGoal(),
      englischDailyGoal: this.currentEnglischGoal(),
      goalsByExercise: this.goalsByExercise(),
    };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }

  private loadLifetime(): void {
    try {
      const raw = localStorage.getItem(this.lifetimeStorageKey);
      if (!raw) {
        this.persistLifetime();
        return;
      }
      const parsed: LifetimeStats = JSON.parse(raw);
      this.lifetimeByType.set(parsed.byType || {});
      this.bestStreaksByTypeSignal.set(parsed.best_streaks_by_type || {});
    } catch (error) {
      console.error('[StatsService] Failed to load lifetime stats from localStorage:', error);
      this.lifetimeByType.set({});
      this.bestStreaksByTypeSignal.set({});
    }
  }

  private persistLifetime(): void {
    const payload: LifetimeStats = {
      byType: this.lifetimeByType(),
      best_streaks_by_type: this.bestStreaksByTypeSignal()
    };
    try {
      localStorage.setItem(this.lifetimeStorageKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }

  getBestStreak(exerciseType: string): number {
    const value = this.bestStreaksByTypeSignal()[exerciseType] ?? 0;
    return value;
  }

  updateBestStreak(exerciseType: string, streak: number): void {
    const current = this.bestStreaksByTypeSignal();
    const currentBest = current[exerciseType] ?? 0;


    if (streak > currentBest) {
      const newStreaks = {
        ...current,
        [exerciseType]: streak
      };
      this.bestStreaksByTypeSignal.set(newStreaks);
      this.persistLifetime();

      // Sync to server in background
      this.syncToServer();
    }
  }

  getMedalLevel(exerciseType: string): 'none' | 'bronze' | 'silver' | 'gold' {
    const count = this.lifetimeByType()[exerciseType] ?? 0;
    if (count >= 1000) return 'gold';
    if (count >= 500) return 'silver';
    if (count >= 100) return 'bronze';
    return 'none';
  }

  getProgressToNextMedal(exerciseType: string): { current: number; target: number; percent: number } {
    const count = this.lifetimeByType()[exerciseType] ?? 0;
    let target = 100;

    if (count >= 1000) {
      target = 1000;
    } else if (count >= 500) {
      target = 1000;
    } else if (count >= 100) {
      target = 500;
    }

    const percent = Math.min(100, Math.round((count / target) * 100));
    return { current: count, target, percent };
  }

  /**
   * Clear all user data (called on logout)
   */
  clearUserData(): void {
    this.date.set(this.today());
    this.byType.set({});
    this.goalsByExercise.set(catalogDefaults());
    this.mathNumberRange.set(100);
    this.lifetimeByType.set({});
    this.bestStreaksByTypeSignal.set({});
    this.hasAnsweredToday.set(false);

    // Clear localStorage
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.lifetimeStorageKey);
    localStorage.removeItem(this.numberRangeStorageKey);
    localStorage.removeItem(this.goalsStorageKey);
  }

  // ============================================================================
  // SERVER SYNC METHODS
  // ============================================================================

  /**
   * Load stats from server if user is authenticated
   */
  private async loadFromServerIfAuthenticated(): Promise<void> {
    if (!this.auth || !this.auth.isAuthenticated()) {
      return;
    }

    await this.loadFromServer();

    // Also load and check streak
    if (this.streakService && this.auth.currentUser()) {
      const userId = this.auth.currentUser()!.id;
      await this.streakService.loadStreak(userId);
      await this.streakService.checkAndUpdateStreak(userId);
    }
  }

  /**
   * Load stats from server and merge with local cache
   */
  async loadFromServer(): Promise<void> {
    if (!this.supabase || !this.auth || !this.auth.isAuthenticated()) {
      return;
    }

    try {
      const userId = this.auth.currentUser()!.id;
      const today = this.today();

      // Load user preferences (goals)
      const user = this.auth.currentUser()!;
      if (user.daily_goals_by_exercise && Object.keys(user.daily_goals_by_exercise).length > 0) {
        this.goalsByExercise.set(mergeGoalsWithDefaults(user.daily_goals_by_exercise));
      } else {
        this.goalsByExercise.set(catalogDefaults());
      }
      this.persistGoals();
      if (user.math_number_range && user.math_number_range >= 100) {
        this.mathNumberRange.set(user.math_number_range);
        try { localStorage.setItem(this.numberRangeStorageKey, String(user.math_number_range)); } catch { /* ignore */ }
      }

      // Load daily stats
      const serverDaily = await this.supabase.getDailyStats(userId, today);

      // Convert server format to local format
      const dailyStats: DailyStats = {
        date: serverDaily.date,
        byType: serverDaily.stats_by_type,
      };

      this.date.set(dailyStats.date);
      this.byType.set(dailyStats.byType);

      // Check if user has answered today (by checking if any type has stats)
      const hasAnswered = Object.keys(dailyStats.byType).length > 0;
      this.hasAnsweredToday.set(hasAnswered);

      // Load lifetime stats
      const serverLifetime = await this.supabase.getLifetimeStats(userId);
      this.lifetimeByType.set(serverLifetime.stats_by_type || {});


      // Merge server and local best streaks (take maximum of each)
      if (serverLifetime.best_streaks_by_type) {
        const localStreaks = this.bestStreaksByTypeSignal();
        const serverStreaks = serverLifetime.best_streaks_by_type;
        const mergedStreaks: Record<string, number> = { ...localStreaks };

        // For each exercise type, take the maximum
        for (const [type, serverValue] of Object.entries(serverStreaks)) {
          const localValue = localStreaks[type] ?? 0;
          mergedStreaks[type] = Math.max(localValue, serverValue as number);
        }

        this.bestStreaksByTypeSignal.set(mergedStreaks);
      }


      // Persist to localStorage (cache)
      this.persist();
      this.persistLifetime();

      // Check badges on load to catch any that should have been awarded
      this.checkBadges();
    } catch {
      // Server load failed, using local cache
    }
  }

  /**
   * Sync current stats to server
   */
  private async syncToServer(): Promise<void> {
    if (!this.supabase || !this.auth || !this.auth.isAuthenticated()) {
      return;
    }

    try {
      const userId = this.auth.currentUser()!.id;

      // Sync daily stats (without goals)
      const dailyStats = {
        date: this.date(),
        stats_by_type: this.byType(),
        math_daily_goal: this.currentGoal(),
        clock_daily_goal: this.currentClockGoal(),
        vocab_daily_goal: this.currentDeutschGoal(),
        englisch_daily_goal: this.currentEnglischGoal(),
      };

      // Upsert daily stats
      await this.supabase.upsertDailyStats(userId, dailyStats);

      // Upsert lifetime stats
      const lifetimeStats = {
        stats_by_type: this.lifetimeByType(),
        best_streaks_by_type: this.bestStreaksByTypeSignal(),
      };
      await this.supabase.upsertLifetimeStats(userId, lifetimeStats);
    } catch {
      // Don't throw - sync is non-critical
    }
  }

  /**
   * Sync daily goals to users table (persistent user preference)
   */
  private async syncGoalsToServer(): Promise<void> {
    if (!this.supabase || !this.auth || !this.auth.isAuthenticated()) {
      return;
    }
    try {
      const userId = this.auth.currentUser()!.id;
      const goals = this.goalsByExercise();
      await this.supabase.updateUserGoals(
        userId,
        this.currentGoal(),
        this.currentClockGoal(),
        this.currentDeutschGoal(),
        this.mathNumberRange(),
        this.currentEnglischGoal(),
        goals
      );
      // Keep the cached user in sync so that a page refresh loads the latest values
      this.auth.updateCurrentUserCache({
        math_daily_goal: this.currentGoal(),
        clock_daily_goal: this.currentClockGoal(),
        vocab_daily_goal: this.currentDeutschGoal(),
        englisch_daily_goal: this.currentEnglischGoal(),
        math_number_range: this.mathNumberRange(),
        daily_goals_by_exercise: goals,
      });
    } catch {
      // Don't throw - sync is non-critical
    }
  }

  /**
   * Update streak when first correct answer of the day
   */
  private async updateStreak(): Promise<void> {
    if (!this.streakService || !this.auth || !this.auth.isAuthenticated()) {
      return;
    }

    try {
      const userId = this.auth.currentUser()!.id;
      await this.streakService.recordPractice(userId);
    } catch (error) {
      console.error('Failed to update streak:', error);
    }
  }

  // ============================================================================
  // GAMIFICATION METHODS (Coins & Badges)
  // ============================================================================

  /**
   * Award 1 coin for correct answer
   */
  private async awardCoinForCorrectAnswer(exerciseType: string): Promise<void> {
    if (!this.auth || !this.auth.isAuthenticated()) {
      return;
    }

    try {
      const userId = this.auth.currentUser()!.id;
      await this.coinsService.awardCoins(userId, 1, 'correct_answer', exerciseType);
    } catch (error) {
      console.error('Failed to award coin for correct answer:', error);
    }
  }

  /**
   * Check and award daily goal bonus (10 coins, once per day per category)
   */
  private async checkDailyGoalBonus(exerciseType: string): Promise<void> {
    if (!this.auth || !this.auth.isAuthenticated()) {
      return;
    }

    const isMathType = this.mathTypes.includes(exerciseType);
    const isClockType = this.clockTypes.includes(exerciseType);
    const isDeutschType = exerciseType.startsWith('deutsch-') && exerciseType !== 'deutsch-hangman';
    const isEnglischType = exerciseType.startsWith('englisch-');

    // Check math goal bonus
    if (isMathType && this.isGoalReached() && !this.mathGoalBonusAwarded()) {
      try {
        const userId = this.auth.currentUser()!.id;
        await this.coinsService.awardCoins(userId, 10, 'daily_goal', 'math');
        this.mathGoalBonusAwarded.set(true);
      } catch (error) {
        console.error('Failed to award math goal bonus:', error);
      }
    }

    // Check clock goal bonus
    if (isClockType && this.isClockGoalReached() && !this.clockGoalBonusAwarded()) {
      try {
        const userId = this.auth.currentUser()!.id;
        await this.coinsService.awardCoins(userId, 10, 'daily_goal', 'clock');
        this.clockGoalBonusAwarded.set(true);
      } catch (error) {
        console.error('Failed to award clock goal bonus:', error);
      }
    }

    // Check Deutsch goal bonus
    if (isDeutschType && this.isDeutschGoalReached() && !this.deutschGoalBonusAwarded()) {
      try {
        const userId = this.auth.currentUser()!.id;
        await this.coinsService.awardCoins(userId, 10, 'daily_goal', 'deutsch');
        this.deutschGoalBonusAwarded.set(true);
      } catch (error) {
        console.error('Failed to award Deutsch goal bonus:', error);
      }
    }

    // Check Englisch goal bonus
    if (isEnglischType && this.isEnglischGoalReached() && !this.englischGoalBonusAwarded()) {
      try {
        const userId = this.auth.currentUser()!.id;
        await this.coinsService.awardCoins(userId, 10, 'daily_goal', 'englisch');
        this.englischGoalBonusAwarded.set(true);
      } catch (error) {
        console.error('Failed to award Englisch goal bonus:', error);
      }
    }
  }

  /**
   * Check badges (debounced, called every 5 answers)
   */
  private async checkBadges(): Promise<void> {
    if (!this.auth || !this.auth.isAuthenticated()) {
      return;
    }

    try {
      const userId = this.auth.currentUser()!.id;

      // Gather badge check data
      const checkData = await this.gatherBadgeCheckData(userId);

      // Check and award new badges
      const newBadges = await this.badgeService.checkAndAwardBadges(userId, checkData);

      if (newBadges.length > 0) {
        // TODO: Show badge notification to user (Phase 5)
      }
    } catch (error) {
      console.error('Failed to check badges:', error);
    }
  }

  /**
   * Gather all data needed for badge checking
   */
  private async gatherBadgeCheckData(userId: string) {
    // Get mastery data
    const masteryRecords = await this.supabase.getMastery(userId);
    const masteredReihen = masteryRecords
      .filter(m => m.mastered)
      .map(m => m.reihe);

    // Get time trial bests
    const timeTrialBests = await this.supabase.getPersonalBests(userId);

    // Get streak data
    const streakData = await this.supabase.getDailyStreak(userId);

    return {
      lifetimeStats: this.lifetimeByType(),
      dailyStats: this.byType(),
      currentStreak: streakData.current_streak,
      longestStreak: streakData.longest_streak,
      bestStreaksByType: this.bestStreaksByTypeSignal(),
      timeTrialBests,
      masteredReihen,
    };
  }
}
