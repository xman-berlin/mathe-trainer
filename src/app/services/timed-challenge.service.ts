import { Injectable, signal } from '@angular/core';

export interface TimeTrialResult {
  exerciseTypes: string[];
  correctCount: number;
  totalCount: number;
  accuracy: number;
  completedAt: string;
}

export interface PersonalBest {
  correctCount: number;
  accuracy: number;
  achievedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimedChallengeService {
  private readonly personalBests = signal<Record<string, PersonalBest>>({});

  constructor() {
    this.load();
  }

  getBestForTypes(types: string[]): PersonalBest | null {
    const key = types.sort().join(',');
    return this.personalBests()[key] || null;
  }

  recordResult(result: TimeTrialResult): boolean {
    const key = result.exerciseTypes.sort().join(',');
    const current = this.personalBests()[key];
    const isNewBest = !current || result.correctCount > current.correctCount;

    if (isNewBest) {
      this.personalBests.update(bests => ({
        ...bests,
        [key]: {
          correctCount: result.correctCount,
          accuracy: result.accuracy,
          achievedAt: result.completedAt
        }
      }));
      this.persist();
    }

    return isNewBest;
  }

  private load(): void {
    try {
      const stored = localStorage.getItem('schlaufuchs-time-trials');
      if (stored) {
        this.personalBests.set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load time trial data:', error);
    }
  }

  private persist(): void {
    try {
      localStorage.setItem('schlaufuchs-time-trials', JSON.stringify(this.personalBests()));
    } catch (error) {
      console.error('Failed to persist time trial data:', error);
    }
  }
}
