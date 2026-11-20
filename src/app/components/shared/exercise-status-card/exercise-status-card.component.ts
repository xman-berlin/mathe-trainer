import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Signal,
  computed,
  signal,
} from '@angular/core';

/** Optional difficulty block for adaptive exercises */
export interface ExerciseDifficultyView {
  emoji: string;
  name: string;
  level: number;
  maxLevel: number;
  /** Correct answers toward next level-up */
  streak: number;
  streakUpNeeded: number;
  nextEmoji?: string | null;
  nextName?: string | null;
  flash?: 'up' | 'down' | null;
}

@Component({
  selector: 'app-exercise-status-card',
  standalone: true,
  imports: [],
  templateUrl: './exercise-status-card.component.html',
  styleUrl: './exercise-status-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseStatusCardComponent {
  @Input() streak: Signal<number> = signal(0);
  @Input() bestStreak: Signal<number> = signal(0);
  @Input() correctCount: Signal<number> = signal(0);
  @Input() incorrectCount: Signal<number> = signal(0);
  /** Pass null/undefined signal value to hide difficulty */
  @Input() difficulty: Signal<ExerciseDifficultyView | null> = signal(null);

  readonly totalCount = computed(() => this.correctCount() + this.incorrectCount());

  readonly levelProgressDots = computed(() => {
    const d = this.difficulty();
    if (!d) return [] as boolean[];
    const filled = Math.min(d.streak, d.streakUpNeeded);
    return Array.from({ length: d.streakUpNeeded }, (_, i) => i < filled);
  });

  readonly isMaxDifficulty = computed(() => {
    const d = this.difficulty();
    return !!d && d.level >= d.maxLevel;
  });
}
