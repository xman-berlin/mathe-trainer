import { Injectable, signal, computed } from '@angular/core';

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
}

interface LifetimeStats {
  byType: Record<string, number>; // Cumulative correct answers per type
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly storageKey = 'schlaufuchs-stats';
  private readonly lifetimeStorageKey = 'schlaufuchs-lifetime-stats';

  private correct = signal(0);
  private incorrect = signal(0);
  private date = signal(this.today());
  private byType = signal<Record<string, ExerciseTypeStats>>({});
  private dailyGoal = signal(20); // Default goal
  private lifetimeByType = signal<Record<string, number>>({});

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

  constructor() {
    this.load();
    this.loadLifetime();
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
    }

    this.persist();
  }

  setDailyGoal(count: number): void {
    if (count < 1) count = 1;
    if (count > 100) count = 100;
    this.dailyGoal.set(count);
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
      dailyGoal: this.dailyGoal()
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
}
