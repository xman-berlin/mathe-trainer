import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { DailyStreakService } from './daily-streak.service';

interface ExerciseTypeStats {
  correct: number;
  incorrect: number;
}

interface DailyStats {
  date: string;
  correct: number;
  incorrect: number;
  byType: Record<string, ExerciseTypeStats>;
  dailyGoal?: number; // Optional for backward compatibility
  clockDailyGoal?: number; // Optional for backward compatibility
}

interface LifetimeStats {
  byType: Record<string, number>; // Cumulative correct answers per type
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly storageKey = 'schlaufuchs-stats';
  private readonly lifetimeStorageKey = 'schlaufuchs-lifetime-stats';

  // Server sync dependencies - not optional, circular dep resolved by lazy loading
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private streakService = inject(DailyStreakService);
  private hasAnsweredToday = signal(false);

  private correct = signal(0);
  private incorrect = signal(0);
  private date = signal(this.today());
  private byType = signal<Record<string, ExerciseTypeStats>>({});
  private dailyGoal = signal(20); // Default goal for math
  private clockDailyGoal = signal(20); // Default goal for clock
  private lifetimeByType = signal<Record<string, number>>({});

  // Math exercise types
  private readonly mathTypes = ['addition', 'subtraction', 'multiplication', 'division'];
  // Clock exercise types
  private readonly clockTypes = ['clock-full', 'clock-half', 'clock-quarter', 'clock-fiveMin'];

  readonly correctCount = this.correct.asReadonly();
  readonly incorrectCount = this.incorrect.asReadonly();
  readonly totalCount = computed(() => this.correct() + this.incorrect());
  readonly statsByType = this.byType.asReadonly();
  readonly currentGoal = this.dailyGoal.asReadonly();
  readonly goalProgressPercent = computed(() =>
    Math.min(100, Math.round((this.correct() / this.dailyGoal()) * 100))
  );
  readonly isGoalReached = computed(() => this.correct() >= this.dailyGoal());
  readonly lifetimeStatsByType = this.lifetimeByType.asReadonly();

  // Clock-specific stats
  readonly clockCorrectCount = computed(() => {
    const types = this.byType();
    let total = 0;
    for (const type of this.clockTypes) {
      total += types[type]?.correct ?? 0;
    }
    return total;
  });

  readonly currentClockGoal = this.clockDailyGoal.asReadonly();
  readonly clockGoalProgressPercent = computed(() =>
    Math.min(100, Math.round((this.clockCorrectCount() / this.clockDailyGoal()) * 100))
  );
  readonly isClockGoalReached = computed(() => this.clockCorrectCount() >= this.clockDailyGoal());

  constructor() {
    this.load();
    this.loadLifetime();

    // Load from server if authenticated
    this.loadFromServerIfAuthenticated();
  }

  recordResult(isCorrect: boolean, exerciseType = 'addition') {
    this.ensureToday();

    if (isCorrect) {
      this.correct.update(v => v + 1);
    } else {
      this.incorrect.update(v => v + 1);
    }

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
      console.log('Correct answer! Checking streak...');
      this.updateStreak();
    }

    this.persist();

    // Sync to server in background (non-blocking)
    console.log('Syncing stats to server...');
    this.syncToServer();
  }

  setDailyGoal(count: number): void {
    if (count < 1) count = 1;
    if (count > 100) count = 100;
    this.dailyGoal.set(count);
    this.persist();
  }

  setClockDailyGoal(count: number): void {
    if (count < 1) count = 1;
    if (count > 100) count = 100;
    this.clockDailyGoal.set(count);
    this.persist();
  }

  resetToday() {
    const today = this.today();
    this.date.set(today);
    this.correct.set(0);
    this.incorrect.set(0);
    this.byType.set({});
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
        this.correct.set(parsed.correct || 0);
        this.incorrect.set(parsed.incorrect || 0);
        this.byType.set(parsed.byType);
        if (parsed.dailyGoal) {
          this.dailyGoal.set(parsed.dailyGoal);
        }
        if (parsed.clockDailyGoal) {
          this.clockDailyGoal.set(parsed.clockDailyGoal);
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
      correct: this.correct(),
      incorrect: this.incorrect(),
      byType: this.byType(),
      dailyGoal: this.dailyGoal(),
      clockDailyGoal: this.clockDailyGoal()
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
    } catch {
      this.lifetimeByType.set({});
    }
  }

  private persistLifetime(): void {
    const payload: LifetimeStats = {
      byType: this.lifetimeByType()
    };
    try {
      localStorage.setItem(this.lifetimeStorageKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
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
    console.log('[StatsService] Clearing user data');
    this.correct.set(0);
    this.incorrect.set(0);
    this.date.set(this.today());
    this.byType.set({});
    this.dailyGoal.set(20);
    this.clockDailyGoal.set(20);
    this.lifetimeByType.set({});
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
      console.log('Not authenticated, skipping server load');
      return;
    }

    console.log('Loading from server (authenticated)...');
    await this.loadFromServer();

    // Also load and check streak
    if (this.streakService && this.auth.currentUser()) {
      const userId = this.auth.currentUser()!.id;
      console.log('Loading streak for user:', userId);
      await this.streakService.loadStreak(userId);
      await this.streakService.checkAndUpdateStreak(userId);
      console.log('Streak data loaded and checked');
    } else {
      console.warn('StreakService not available or no current user');
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

      console.log('Loading stats from server for user:', userId, 'date:', today);

      // Load daily stats
      const serverDaily = await this.supabase.getDailyStats(userId, today);
      console.log('Server daily stats:', serverDaily);

      // Convert server format to local format
      const dailyStats: DailyStats = {
        date: serverDaily.date,
        correct: serverDaily.correct,
        incorrect: serverDaily.incorrect,
        byType: this.convertStatsToLocal(serverDaily.stats_by_type),
        dailyGoal: serverDaily.math_daily_goal,
        clockDailyGoal: serverDaily.clock_daily_goal,
      };

      // Update local state from server (server is source of truth)
      this.date.set(dailyStats.date);
      this.correct.set(dailyStats.correct);
      this.incorrect.set(dailyStats.incorrect);
      this.byType.set(dailyStats.byType);
      if (dailyStats.dailyGoal) this.dailyGoal.set(dailyStats.dailyGoal);
      if (dailyStats.clockDailyGoal) this.clockDailyGoal.set(dailyStats.clockDailyGoal);

      // Check if user has answered today
      const hasAnswered = dailyStats.correct > 0 || dailyStats.incorrect > 0;
      this.hasAnsweredToday.set(hasAnswered);
      console.log('Has answered today:', hasAnswered);

      // Load lifetime stats
      const serverLifetime = await this.supabase.getLifetimeStats(userId);
      this.lifetimeByType.set(serverLifetime.stats_by_type || {});
      console.log('Lifetime stats loaded:', serverLifetime.stats_by_type);

      // Persist to localStorage (cache)
      this.persist();
      this.persistLifetime();
    } catch (error) {
      console.warn('Failed to load from server, using local cache:', error);
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
        correct: this.correct(),
        incorrect: this.incorrect(),
        stats_by_type: this.convertStatsToServer(this.byType()),
        math_daily_goal: this.dailyGoal(),
        clock_daily_goal: this.clockDailyGoal(),
      };

      // Upsert daily stats
      await this.supabase.upsertDailyStats(userId, dailyStats);

      // Upsert lifetime stats
      const lifetimeStats = {
        stats_by_type: this.lifetimeByType(),
      };
      await this.supabase.upsertLifetimeStats(userId, lifetimeStats);
    } catch (error) {
      console.warn('Failed to sync to server:', error);
      // Don't throw - sync is non-critical
    }
  }

  /**
   * Update streak when first correct answer of the day
   */
  private async updateStreak(): Promise<void> {
    if (!this.streakService || !this.auth || !this.auth.isAuthenticated()) {
      console.warn('Cannot update streak - missing dependencies');
      return;
    }

    try {
      const userId = this.auth.currentUser()!.id;
      console.log('Recording practice for streak, userId:', userId);
      await this.streakService.recordPractice(userId);
      console.log('Streak updated successfully');
    } catch (error) {
      console.error('Failed to update streak:', error);
    }
  }

  /**
   * Convert server stats format to local format
   */
  private convertStatsToLocal(
    serverStats: Record<string, { correct: number; incorrect: number }>
  ): Record<string, ExerciseTypeStats> {
    return serverStats;
  }

  /**
   * Convert local stats format to server format
   */
  private convertStatsToServer(
    localStats: Record<string, ExerciseTypeStats>
  ): Record<string, { correct: number; incorrect: number }> {
    return localStats;
  }
}
