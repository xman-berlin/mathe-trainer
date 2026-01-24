import { Injectable, signal } from '@angular/core';

interface ExerciseTypeStats {
  correct: number;
  incorrect: number;
}

interface DailyStats {
  date: string;
  correct: number;
  incorrect: number;
  byType: Record<string, ExerciseTypeStats>;
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly storageKey = 'mathe-trainer-stats';

  private correct = signal(0);
  private incorrect = signal(0);
  private date = signal(this.today());
  private byType = signal<Record<string, ExerciseTypeStats>>({});

  readonly correctCount = this.correct.asReadonly();
  readonly incorrectCount = this.incorrect.asReadonly();
  readonly totalCount = signal(0);
  readonly statsByType = this.byType.asReadonly();

  constructor() {
    this.load();
  }

  recordResult(isCorrect: boolean, exerciseType: string = 'addition') {
    this.ensureToday();
    if (isCorrect) {
      this.correct.update(v => v + 1);
    } else {
      this.incorrect.update(v => v + 1);
    }
    this.totalCount.set(this.correct() + this.incorrect());

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

    this.persist();
  }

  resetToday() {
    const today = this.today();
    this.date.set(today);
    this.correct.set(0);
    this.incorrect.set(0);
    this.totalCount.set(0);
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
        this.totalCount.set((parsed.correct || 0) + (parsed.incorrect || 0));
        this.byType.set(parsed.byType);
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
      byType: this.byType()
    };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }
}
