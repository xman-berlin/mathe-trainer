import { Component, signal, computed, inject, effect, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClockService, ClockExerciseType, ClockProblem } from '../../services/clock';
import { ClockDisplayComponent } from '../clock-display/clock-display';
import { StatsService } from '../../services/stats.service';
import { TimedChallengeService } from '../../services/timed-challenge.service';
import { KeypadComponent } from '../shared/keypad/keypad.component';
import { ExerciseStateService } from '../../services/exercise-state.service';
import { PracticePlanService } from '../../services/practice-plan.service';
import { createStatsAggregator } from '../../utils/stats-aggregator';

@Component({
  standalone: true,
  selector: 'app-clock-exercise',
  imports: [RouterLink, FormsModule, ClockDisplayComponent, KeypadComponent],
  templateUrl: './clock-exercise.html',
  styleUrl: './clock-exercise.scss',
  providers: [ExerciseStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClockExerciseComponent implements OnInit, OnDestroy {
  private clockService = inject(ClockService);
  private stats = inject(StatsService);
  private timedChallengeService = inject(TimedChallengeService);
  private route = inject(ActivatedRoute);
  protected practicePlan = inject(PracticePlanService);

  // State
  selectedTypes = signal<Set<ClockExerciseType>>(new Set(['full', 'half', 'quarter', 'fiveMin']));
  currentType = signal<ClockExerciseType>('full');
  currentProblem = signal<ClockProblem | null>(null);
  userAnswer = signal('');
  showFeedback = signal(false);
  isCorrect = signal(false);

  // Mode
  readonly mode = signal<'practice' | 'timeTrial'>('practice');

  // Streak tracking (delegated to ExerciseStateService)
  private exerciseState = inject(ExerciseStateService);
  readonly streak = this.exerciseState.streak;
  readonly bestStreak = this.exerciseState.bestStreak;
  readonly showMilestone = this.exerciseState.showMilestone;
  readonly milestoneValue = this.exerciseState.milestoneValue;
  readonly confettiPieces = this.exerciseState.confettiPieces;
  get confettiX() { return this.exerciseState.confettiX; }

  // Time Trial Mode
  readonly timeTrialActive = signal(false);
  readonly timeRemaining = signal(60);
  readonly timeTrialCorrect = signal(0);
  readonly timeTrialTotal = signal(0);
  readonly showTimeTrialResults = signal(false);
  readonly isNewPersonalBest = signal(false);
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Problem history - prevent same problem within 10 exercises
  private problemHistory: { hours: number; minutes: number }[] = [];
  private readonly historySize = 10;

  // Available exercise types
  readonly exerciseTypes: ClockExerciseType[] = ['full', 'half', 'quarter', 'fiveMin'];

  // Computed
  readonly timeOfDayLabel = computed(() => {
    const problem = this.currentProblem();
    return problem ? this.clockService.getTimeOfDayLabel(problem.timeOfDay) : '';
  });

  private statsAgg = createStatsAggregator(this.stats, this.selectedTypes, 'clock-');
  readonly typeCorrectCount = this.statsAgg.correct;
  readonly typeIncorrectCount = this.statsAgg.incorrect;
  readonly typeTotalCount = this.statsAgg.total;

  readonly timeTrialAccuracy = computed(() => {
    const total = this.timeTrialTotal();
    return total > 0 ? Math.round((this.timeTrialCorrect() / total) * 100) : 0;
  });

  readonly currentPersonalBest = computed(() => {
    const types = Array.from(this.selectedTypes()).map(t => `clock-${t}`);
    return this.timedChallengeService.getBestForTypes(types);
  });

  constructor() {
    // Generate initial problem
    this.generateProblem();

    // Auto-focus on input when feedback is hidden
    effect(() => {
      if (!this.showFeedback()) {
        setTimeout(() => {
          const input = document.querySelector('.time-input') as HTMLInputElement;
          input?.focus();
        }, 100);
      }
    });
  }

  ngOnInit(): void {
    // Set mode from route data
    const mode = this.route.snapshot.data['mode'] as 'practice' | 'timeTrial' | undefined;
    if (mode) {
      this.mode.set(mode);

      // In time trial mode, only one type can be selected
      if (mode === 'timeTrial' && this.selectedTypes().size > 1) {
        const firstType = Array.from(this.selectedTypes())[0];
        this.selectedTypes.set(new Set([firstType]));
      }
    }

    if (this.practicePlan.typesLocked()) {
      this.selectedTypes.set(new Set(['full', 'half', 'quarter', 'fiveMin']));
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.exerciseState.reset();
  }

  generateProblem(): void {
    // Select random type from selected types
    const selected = Array.from(this.selectedTypes());
    if (selected.length === 0) return;

    const type = selected[Math.floor(Math.random() * selected.length)];
    this.currentType.set(type);

    // Generate problem, ensuring it's not in recent history
    let problem: ClockProblem;
    let attempts = 0;
    const maxAttempts = 50;

    do {
      problem = this.clockService.generateProblem(type);
      attempts++;
    } while (
      attempts < maxAttempts &&
      this.isProblemInHistory(problem.hours, problem.minutes)
    );

    // Add to history
    this.problemHistory.push({ hours: problem.hours, minutes: problem.minutes });
    if (this.problemHistory.length > this.historySize) {
      this.problemHistory.shift(); // Remove oldest
    }

    this.currentProblem.set(problem);
    this.userAnswer.set('');
    this.showFeedback.set(false);
  }

  private isProblemInHistory(hours: number, minutes: number): boolean {
    return this.problemHistory.some(
      p => p.hours === hours && p.minutes === minutes
    );
  }

  toggleType(type: ClockExerciseType): void {
    if (this.practicePlan.typesLocked()) return;
    if (this.mode() === 'timeTrial') {
      // Time trial mode: only one type can be selected
      this.selectedTypes.set(new Set([type]));
    } else {
      // Practice mode: multi-select allowed
      const current = new Set(this.selectedTypes());
      if (current.has(type)) {
        // Don't allow deselecting if it's the only one selected or if locked
        if (current.size > 1 && !this.isTypeLocked(type)) {
          current.delete(type);
        }
      } else {
        current.add(type);
      }
      this.selectedTypes.set(current);
    }
    this.generateProblem();
  }

  isTypeSelected(type: ClockExerciseType): boolean {
    return this.selectedTypes().has(type);
  }

   readonly lockedTypes = computed(() => {
    const lifetime = this.stats.lifetimeStatsByType();
    return new Set<ClockExerciseType>(
      (['full', 'half', 'quarter', 'fiveMin'] as ClockExerciseType[])
        .filter(t => (lifetime[`clock-${t}`] ?? 0) >= 100)
    );
  });

  isTypeLocked(type: ClockExerciseType): boolean {
    return this.lockedTypes().has(type);
  }

  getTypeLabel(type: ClockExerciseType): string {
    return this.clockService.getTypeLabel(type);
  }

  getTypeIcon(type: ClockExerciseType): string {
    return this.clockService.getTypeIcon(type);
  }

  submitAnswer(): void {
    const answer = this.userAnswer().trim();
    const problem = this.currentProblem();

    if (!problem || !answer) return;
    if (this.showFeedback()) return; // Prevent multiple submissions

    // Validate format
    if (!this.clockService.isValidFormat(answer)) {
      alert('Bitte gib die Zeit mit führender Null ein (z.B. 09:00 oder 15:30)');
      return;
    }

    // Check if correct
    const correct = this.clockService.isCorrect(answer, problem.correctAnswer);
    this.isCorrect.set(correct);
    this.showFeedback.set(true);

    if (this.mode() === 'timeTrial' && this.timeTrialActive()) {
      // Time trial mode - track separately
      this.timeTrialTotal.update(n => n + 1);
      if (correct) {
        this.timeTrialCorrect.update(n => n + 1);
      }

      // Reduced delays for time trial
      const delay = correct ? 300 : 600;
      setTimeout(() => {
        if (this.timeTrialActive()) {
          this.generateProblem();
        }
      }, delay);
    } else {
      // Practice mode
      // Record stats with type prefix "clock-"
      const exerciseType = `clock-${this.currentType()}`;
      this.stats.recordResult(correct, exerciseType);
      if (correct) {
        this.practicePlan.recordCorrect('clock');
      }

      this.exerciseState.handleResult(correct, () => this.generateProblem(), 1000, 2000);
    }
  }

  startTimeTrial(): void {
    this.timeRemaining.set(60);
    this.timeTrialCorrect.set(0);
    this.timeTrialTotal.set(0);
    this.timeTrialActive.set(true);
    this.showTimeTrialResults.set(false);
    this.isNewPersonalBest.set(false);
    this.problemHistory = []; // Reset history for new trial
    this.generateProblem();

    this.timerInterval = setInterval(() => {
      const remaining = this.timeRemaining() - 1;
      this.timeRemaining.set(remaining);

      if (remaining <= 0) {
        this.stopTimeTrial();
      }
    }, 1000);
  }

  stopTimeTrial(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.timeTrialActive.set(false);

    const result = {
      exerciseTypes: Array.from(this.selectedTypes()).map(t => `clock-${t}`),
      correctCount: this.timeTrialCorrect(),
      totalCount: this.timeTrialTotal(),
      accuracy: this.timeTrialAccuracy(),
      completedAt: new Date().toISOString()
    };

    const isNewBest = this.timedChallengeService.recordResult(result);
    this.isNewPersonalBest.set(isNewBest);
    this.showTimeTrialResults.set(true);
  }

  restartTimeTrial(): void {
    this.showTimeTrialResults.set(false);
    setTimeout(() => this.startTimeTrial(), 300);
  }

  exitTimeTrial(): void {
    this.showTimeTrialResults.set(false);
    this.mode.set('practice');
  }

}
