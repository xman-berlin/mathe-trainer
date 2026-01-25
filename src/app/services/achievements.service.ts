import { Injectable, signal, computed } from '@angular/core';

interface ReihenMastery {
  currentStreak: number;
  mastered: boolean;
  masteredAt?: string;
}

type MultiplicationMastery = Record<number, ReihenMastery>;

interface AchievementsData {
  multiplicationMastery: MultiplicationMastery;
}

@Injectable({ providedIn: 'root' })
export class AchievementsService {
  private readonly storageKey = 'mathe-trainer-achievements';
  private readonly MASTERY_THRESHOLD = 10;

  private multiplicationMastery = signal<MultiplicationMastery>({});

  readonly masteryData = this.multiplicationMastery.asReadonly();

  readonly masteredReihen = computed(() => {
    const mastery = this.multiplicationMastery();
    return Object.entries(mastery)
      .filter(([, data]) => data.mastered)
      .map(([reihe]) => Number(reihe))
      .sort((a, b) => a - b);
  });

  readonly totalMastered = computed(() => this.masteredReihen().length);

  constructor() {
    this.load();
  }

  recordMultiplicationResult(reihe: number, isCorrect: boolean) {
    const current = this.multiplicationMastery();
    const reiheData = current[reihe] ?? { currentStreak: 0, mastered: false };

    if (isCorrect) {
      const newStreak = reiheData.currentStreak + 1;

      // Check if mastery achieved
      const newMastered = newStreak >= this.MASTERY_THRESHOLD;
      const masteredAt = newMastered && !reiheData.mastered ? new Date().toISOString() : reiheData.masteredAt;

      this.multiplicationMastery.set({
        ...current,
        [reihe]: {
          currentStreak: newStreak,
          mastered: newMastered,
          masteredAt
        }
      });
    } else {
      // Reset streak on incorrect answer (but keep mastery status if already achieved)
      this.multiplicationMastery.set({
        ...current,
        [reihe]: {
          ...reiheData,
          currentStreak: 0
        }
      });
    }

    this.persist();
  }

  getMastery(reihe: number): ReihenMastery {
    return this.multiplicationMastery()[reihe] ?? { currentStreak: 0, mastered: false };
  }

  private load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        this.persist();
        return;
      }
      const parsed: AchievementsData = JSON.parse(raw);
      this.multiplicationMastery.set(parsed.multiplicationMastery ?? {});
    } catch {
      this.multiplicationMastery.set({});
      this.persist();
    }
  }

  private persist() {
    const payload: AchievementsData = {
      multiplicationMastery: this.multiplicationMastery()
    };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }
}
