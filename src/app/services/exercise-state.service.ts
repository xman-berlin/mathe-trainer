import { Injectable, signal } from '@angular/core';

/**
 * ExerciseStateService
 *
 * Centralizes streak management, milestone detection, and confetti
 * for exercise components. Provided at component level (not root)
 * so each exercise instance gets its own state.
 *
 * Usage in component:
 *   providers: [ExerciseStateService]
 *   private exerciseState = inject(ExerciseStateService);
 */
@Injectable()
export class ExerciseStateService {
  // --- Streak ---
  readonly streak = signal(0);
  readonly bestStreak = signal(0);
  readonly showMilestone = signal(false);
  readonly milestoneValue = signal(0);

  // --- Confetti (static config, generated once) ---
  readonly confettiPieces = Array.from({ length: 20 }, (_, i) => i);
  readonly confettiX = Array.from({ length: 20 }, () => Math.random() * 100);

  private milestones = [5, 10, 20, 30, 40, 50];

  /**
   * Configure which milestone thresholds trigger the popup.
   * Call once after construction if you need different milestones.
   */
  setMilestones(values: number[]): void {
    this.milestones = values;
  }

  /**
   * Process a single answer result:
   * - Increments or resets streak
   * - Detects and shows milestone popup
   * - Schedules onAdvance() after the appropriate delay
   *
   * @param correctDelay   ms to wait before advancing on correct answer (default: 600)
   * @param incorrectDelay ms to wait before advancing on incorrect answer (default: 1200)
   */
  handleResult(isCorrect: boolean, onAdvance: () => void, correctDelay = 600, incorrectDelay = 1200): void {
    if (isCorrect) {
      this.streak.update(s => s + 1);
      if (this.streak() > this.bestStreak()) {
        this.bestStreak.set(this.streak());
      }
      const milestone = this.milestones.find(m => this.streak() === m);
      if (milestone) {
        this.milestoneValue.set(milestone);
        this.showMilestone.set(true);
        setTimeout(() => this.showMilestone.set(false), 2000);
      }
      setTimeout(onAdvance, correctDelay);
    } else {
      this.streak.set(0);
      setTimeout(onAdvance, incorrectDelay);
    }
  }

  /** Reset all state (e.g., when starting a new session). */
  reset(): void {
    this.streak.set(0);
    this.bestStreak.set(0);
    this.showMilestone.set(false);
    this.milestoneValue.set(0);
  }
}
