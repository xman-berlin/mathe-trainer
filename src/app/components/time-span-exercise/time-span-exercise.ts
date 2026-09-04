import {
  Component,
  signal,
  computed,
  inject,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  DurationService,
  TimeSpanKind,
  TimeSpanProblem,
  formatDuration,
} from '../../services/duration.service';
import { StatsService } from '../../services/stats.service';
import { KeypadComponent } from '../shared/keypad/keypad.component';
import { ExerciseStateService } from '../../services/exercise-state.service';
import { createStatsAggregator } from '../../utils/stats-aggregator';

@Component({
  standalone: true,
  selector: 'app-time-span-exercise',
  imports: [RouterLink, KeypadComponent],
  templateUrl: './time-span-exercise.html',
  styleUrl: './time-span-exercise.scss',
  providers: [ExerciseStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeSpanExerciseComponent implements OnDestroy {
  private durationService = inject(DurationService);
  private stats = inject(StatsService);
  private exerciseState = inject(ExerciseStateService);

  private readonly STORAGE_KEY = 'schlaufuchs-timespan-types';
  private readonly ALL_TYPES: TimeSpanKind[] = ['zeitspanne', 'verspaetung'];

  readonly exerciseTypes: TimeSpanKind[] = this.ALL_TYPES;
  selectedTypes = signal<Set<TimeSpanKind>>(this.loadSelectedTypes());
  currentKind = signal<TimeSpanKind>('zeitspanne');
  currentProblem = signal<TimeSpanProblem | null>(null);

  userAnswer = signal('');
  durationHours = signal('');
  durationMinutes = signal('');
  durationField = signal<'hours' | 'minutes'>('minutes');

  showFeedback = signal(false);
  isCorrect = signal(false);

  readonly streak = this.exerciseState.streak;
  readonly bestStreak = this.exerciseState.bestStreak;
  readonly showMilestone = this.exerciseState.showMilestone;
  readonly milestoneValue = this.exerciseState.milestoneValue;
  readonly confettiPieces = this.exerciseState.confettiPieces;
  get confettiX() {
    return this.exerciseState.confettiX;
  }

  private problemHistory: string[] = [];
  private readonly historySize = 10;

  private statsAgg = createStatsAggregator(this.stats, this.selectedTypes, 'clock-');
  readonly typeCorrectCount = this.statsAgg.correct;
  readonly typeIncorrectCount = this.statsAgg.incorrect;
  readonly typeTotalCount = this.statsAgg.total;

  readonly keypadMode = computed(() =>
    this.currentKind() === 'verspaetung' ? 'time' : 'numeric'
  );

  readonly keypadValue = computed(() => {
    if (this.currentKind() === 'verspaetung') {
      return this.userAnswer();
    }
    return this.durationField() === 'hours' ? this.durationHours() : this.durationMinutes();
  });

  readonly keypadDisabled = computed(() => this.showFeedback());

  readonly formattedUserDuration = computed(() => {
    const hoursRaw = this.durationHours();
    const minutesRaw = this.durationMinutes();
    if (!hoursRaw && !minutesRaw) {
      return '';
    }
    const hours = hoursRaw ? parseInt(hoursRaw, 10) : 0;
    const minutes = minutesRaw ? parseInt(minutesRaw, 10) : 0;
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return '';
    }
    return formatDuration(hours * 60 + minutes);
  });

  readonly startTimeLabel = computed(() => {
    const problem = this.currentProblem();
    if (!problem || problem.kind !== 'zeitspanne') {
      return '';
    }
    return this.durationService.formatGermanTime(problem.startHours, problem.startMinutes);
  });

  readonly endTimeLabel = computed(() => {
    const problem = this.currentProblem();
    if (!problem || problem.kind !== 'zeitspanne') {
      return '';
    }
    return this.durationService.formatGermanTime(problem.endHours, problem.endMinutes);
  });

  readonly scheduledTimeLabel = computed(() => {
    const problem = this.currentProblem();
    if (!problem || problem.kind !== 'verspaetung') {
      return '';
    }
    return this.durationService.formatGermanTime(problem.scheduledHours, problem.scheduledMinutes);
  });

  readonly correctAnswerLabel = computed(() => {
    const problem = this.currentProblem();
    if (!problem) {
      return '';
    }
    if (problem.kind === 'zeitspanne') {
      return this.durationService.formatDuration(problem.durationMinutes);
    }
    return this.durationService.formatGermanTime(problem.newHours, problem.newMinutes);
  });

  readonly lockedTypes = computed(() => {
    const lifetime = this.stats.lifetimeStatsByType();
    return new Set<TimeSpanKind>(
      this.ALL_TYPES.filter((kind) => (lifetime[`clock-${kind}`] ?? 0) >= 100)
    );
  });

  constructor() {
    this.generateProblem();
  }

  ngOnDestroy(): void {
    this.exerciseState.reset();
  }

  generateProblem(): void {
    const selected = Array.from(this.selectedTypes());
    if (selected.length === 0) {
      return;
    }

    const kind = selected[Math.floor(Math.random() * selected.length)];
    this.currentKind.set(kind);

    let problem: TimeSpanProblem;
    let attempts = 0;
    const maxAttempts = 50;
    do {
      problem = this.durationService.generateProblem(kind);
      attempts++;
    } while (attempts < maxAttempts && this.isProblemInHistory(problem));

    this.problemHistory.push(this.problemKey(problem));
    if (this.problemHistory.length > this.historySize) {
      this.problemHistory.shift();
    }

    this.currentProblem.set(problem);
    this.userAnswer.set('');
    this.durationHours.set('');
    this.durationMinutes.set('');
    this.durationField.set('minutes');
    this.showFeedback.set(false);
  }

  toggleType(kind: TimeSpanKind): void {
    const current = new Set(this.selectedTypes());
    if (current.has(kind)) {
      if (current.size > 1 && !this.isTypeLocked(kind)) {
        current.delete(kind);
      }
    } else {
      current.add(kind);
    }
    this.selectedTypes.set(current);
    this.saveSelectedTypes(current);
    this.generateProblem();
  }

  isTypeSelected(kind: TimeSpanKind): boolean {
    return this.selectedTypes().has(kind);
  }

  isTypeLocked(kind: TimeSpanKind): boolean {
    return this.lockedTypes().has(kind);
  }

  getTypeLabel(kind: TimeSpanKind): string {
    return this.durationService.getTypeLabel(kind);
  }

  getTypeIcon(kind: TimeSpanKind): string {
    return this.durationService.getTypeIcon(kind);
  }

  selectDurationField(field: 'hours' | 'minutes'): void {
    if (this.showFeedback()) {
      return;
    }
    this.durationField.set(field);
  }

  onKeypadValueChange(next: string): void {
    if (this.currentKind() === 'verspaetung') {
      this.userAnswer.set(next);
      return;
    }
    if (this.durationField() === 'hours') {
      this.durationHours.set(next.slice(0, 2));
    } else {
      this.durationMinutes.set(next.slice(0, 3));
    }
  }

  submitAnswer(): void {
    const problem = this.currentProblem();
    if (!problem || this.showFeedback()) {
      return;
    }

    let correct = false;
    if (problem.kind === 'zeitspanne') {
      const hoursRaw = this.durationHours();
      const minutesRaw = this.durationMinutes();
      if (!hoursRaw && !minutesRaw) {
        return;
      }
      const hours = hoursRaw ? parseInt(hoursRaw, 10) : 0;
      const minutes = minutesRaw ? parseInt(minutesRaw, 10) : 0;
      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return;
      }
      const total = hours * 60 + minutes;
      if (total <= 0) {
        return;
      }
      correct = total === problem.durationMinutes;
    } else {
      const answer = this.userAnswer().trim();
      if (!answer) {
        return;
      }
      correct = this.durationService.isTimeCorrect(answer, problem.newHours, problem.newMinutes);
    }

    this.isCorrect.set(correct);
    this.showFeedback.set(true);
    this.stats.recordResult(correct, `clock-${problem.kind}`);
    this.exerciseState.handleResult(correct, () => this.generateProblem(), 1000, 2000);
  }

  private problemKey(problem: TimeSpanProblem): string {
    if (problem.kind === 'zeitspanne') {
      return `z-${problem.startHours}:${problem.startMinutes}-${problem.endHours}:${problem.endMinutes}`;
    }
    return `v-${problem.scheduledHours}:${problem.scheduledMinutes}+${problem.delayMinutes}-${problem.destination}`;
  }

  private isProblemInHistory(problem: TimeSpanProblem): boolean {
    return this.problemHistory.includes(this.problemKey(problem));
  }

  private loadSelectedTypes(): Set<TimeSpanKind> {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = (parsed as string[]).filter((t): t is TimeSpanKind =>
            this.ALL_TYPES.includes(t as TimeSpanKind)
          );
          if (valid.length > 0) {
            return new Set(valid);
          }
        }
      }
    } catch {
      // ignore corrupt storage
    }
    return new Set(this.ALL_TYPES);
  }

  private saveSelectedTypes(types: Set<TimeSpanKind>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(types)));
    } catch {
      // ignore storage errors
    }
  }
}
