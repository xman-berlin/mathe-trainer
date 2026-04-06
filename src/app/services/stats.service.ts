import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { DailyStreakService } from './daily-streak.service';
import { CoinsService } from './coins.service';
import { BadgeService } from './badge.service';

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
}

interface LifetimeStats {
  byType: Record<string, number>; // Cumulative correct answers per type
  best_streaks_by_type?: Record<string, number>; // Best streaks per type
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly storageKey = 'schlaufuchs-stats';
  private readonly lifetimeStorageKey = 'schlaufuchs-lifetime-stats';

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

  private date = signal(this.today());
  private byType = signal<Record<string, ExerciseTypeStats>>({});
  private dailyGoal = signal(20); // Default goal for math
  private clockDailyGoal = signal(20); // Default goal for clock
  private vocabDailyGoal = signal(10); // Default goal for Deutsch category (stored as vocab_daily_goal in DB)
  private lifetimeByType = signal<Record<string, number>>({});
  private bestStreaksByTypeSignal = signal<Record<string, number>>({});

  // Math exercise types
  private readonly mathTypes = ['addition', 'subtraction', 'multiplication', 'division', 'word-problems'];
  // Clock exercise types
  private readonly clockTypes = ['clock-full', 'clock-half', 'clock-quarter', 'clock-fiveMin', 'clock-setClock-full', 'clock-setClock-half', 'clock-setClock-quarter', 'clock-setClock-fiveMin'];
  // Vocab exercise types start with 'vocab-'

  readonly statsByType = this.byType.asReadonly();
  readonly currentGoal = this.dailyGoal.asReadonly();
  readonly lifetimeStatsByType = this.lifetimeByType.asReadonly();

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

  readonly goalProgressPercent = computed(() =>
    Math.min(100, Math.round((this.mathCorrectCount() / this.dailyGoal()) * 100))
  );
  readonly isGoalReached = computed(() => this.mathCorrectCount() >= this.dailyGoal());

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

  readonly currentClockGoal = this.clockDailyGoal.asReadonly();
  readonly clockGoalProgressPercent = computed(() =>
    Math.min(100, Math.round((this.clockCorrectCount() / this.clockDailyGoal()) * 100))
  );
  readonly isClockGoalReached = computed(() => this.clockCorrectCount() >= this.clockDailyGoal());
  readonly bestStreaksByType = this.bestStreaksByTypeSignal.asReadonly();

  // Deutsch-specific stats (exercise type: 'deutsch-rechtschreibung', future: 'deutsch-artikel')
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

  readonly currentDeutschGoal = this.vocabDailyGoal.asReadonly();
  readonly deutschGoalProgressPercent = computed(() =>
    Math.min(100, Math.round((this.deutschCorrectCount() / this.vocabDailyGoal()) * 100))
  );
  readonly isDeutschGoalReached = computed(() => this.deutschCorrectCount() >= this.vocabDailyGoal());

  constructor() {
    this.load();
    this.loadLifetime();

    // Load from server if authenticated
    this.loadFromServerIfAuthenticated();
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

  setDailyGoal(count: number): void {
    if (count < 1) count = 1;
    if (count > 100) count = 100;
    this.dailyGoal.set(count);
    this.persist();
    this.syncToServer();
  }

  setClockDailyGoal(count: number): void {
    if (count < 1) count = 1;
    if (count > 100) count = 100;
    this.clockDailyGoal.set(count);
    this.persist();
    this.syncToServer();
  }

  setDeutschDailyGoal(count: number): void {
    if (count < 1) count = 1;
    if (count > 100) count = 100;
    this.vocabDailyGoal.set(count);
    this.persist();
    this.syncToServer();
  }

  resetToday() {
    const today = this.today();
    this.date.set(today);
    this.byType.set({});
    this.mathGoalBonusAwarded.set(false);
    this.clockGoalBonusAwarded.set(false);
    this.deutschGoalBonusAwarded.set(false);
    // Note: goal signals (dailyGoal, clockDailyGoal, vocabDailyGoal) are preserved
    // across days — they are user preferences, not daily counters.
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

  private load() {
    try {
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
        if (parsed.dailyGoal) {
          this.dailyGoal.set(parsed.dailyGoal);
        }
        if (parsed.clockDailyGoal) {
          this.clockDailyGoal.set(parsed.clockDailyGoal);
        }
        if (parsed.vocabDailyGoal) {
          this.vocabDailyGoal.set(parsed.vocabDailyGoal);
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
      dailyGoal: this.dailyGoal(),
      clockDailyGoal: this.clockDailyGoal(),
      vocabDailyGoal: this.vocabDailyGoal(),
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
    this.dailyGoal.set(20);
    this.clockDailyGoal.set(20);
    this.vocabDailyGoal.set(10);
    this.lifetimeByType.set({});
    this.bestStreaksByTypeSignal.set({});
    this.hasAnsweredToday.set(false);

    // Clear localStorage
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.lifetimeStorageKey);
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


      // Load daily stats
      const serverDaily = await this.supabase.getDailyStats(userId, today);

      // Convert server format to local format
      const dailyStats: DailyStats = {
        date: serverDaily.date,
        byType: serverDaily.stats_by_type,
        dailyGoal: serverDaily.math_daily_goal,
        clockDailyGoal: serverDaily.clock_daily_goal,
        vocabDailyGoal: serverDaily.vocab_daily_goal,
      };

      // Update local state from server (server is source of truth)
      this.date.set(dailyStats.date);
      this.byType.set(dailyStats.byType);
      if (dailyStats.dailyGoal) this.dailyGoal.set(dailyStats.dailyGoal);
      if (dailyStats.clockDailyGoal) this.clockDailyGoal.set(dailyStats.clockDailyGoal);
      if (dailyStats.vocabDailyGoal) this.vocabDailyGoal.set(dailyStats.vocabDailyGoal);

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

      // Convert local format to server format
      const dailyStats = {
        date: this.date(),
        stats_by_type: this.byType(),
        math_daily_goal: this.dailyGoal(),
        clock_daily_goal: this.clockDailyGoal(),
        vocab_daily_goal: this.vocabDailyGoal(),
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
    const isDeutschType = exerciseType.startsWith('deutsch-');

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
