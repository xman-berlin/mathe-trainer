import { Component, signal, computed, inject, effect, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClockService, ClockExerciseType, ClockProblem } from '../../services/clock';
import { ClockDisplayComponent } from '../clock-display/clock-display';
import { StatsService } from '../../services/stats.service';
import { TimedChallengeService } from '../../services/timed-challenge.service';

@Component({
  standalone: true,
  selector: 'app-clock-exercise',
  imports: [RouterLink, FormsModule, ClockDisplayComponent],
  templateUrl: './clock-exercise.html',
  styleUrl: './clock-exercise.css'
})
export class ClockExerciseComponent implements OnInit, OnDestroy {
  private clockService = inject(ClockService);
  private stats = inject(StatsService);
  private timedChallengeService = inject(TimedChallengeService);
  private route = inject(ActivatedRoute);

  // State
  selectedTypes = signal<Set<ClockExerciseType>>(new Set(['full', 'half', 'quarter', 'fiveMin']));
  currentType = signal<ClockExerciseType>('full');
  currentProblem = signal<ClockProblem | null>(null);
  userAnswer = signal('');
  showFeedback = signal(false);
  isCorrect = signal(false);

  // Mode
  readonly mode = signal<'practice' | 'timeTrial'>('practice');

  // Streak tracking
  streak = signal(0);
  bestStreak = signal(0);
  showMilestone = signal(false);
  milestoneValue = signal(0);
  private streakMilestones = [5, 10, 20, 30, 40, 50];

  // Time Trial Mode
  readonly timeTrialActive = signal(false);
  readonly timeRemaining = signal(60);
  readonly timeTrialCorrect = signal(0);
  readonly timeTrialTotal = signal(0);
  readonly showTimeTrialResults = signal(false);
  readonly isNewPersonalBest = signal(false);
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Confetti
  confettiPieces = Array.from({ length: 20 }, (_, i) => i);
  confettiX = Array.from({ length: 20 }, () => Math.random() * 100);

  // Available exercise types
  readonly exerciseTypes: ClockExerciseType[] = ['full', 'half', 'quarter', 'fiveMin'];

  // Computed
  readonly timeOfDayLabel = computed(() => {
    const problem = this.currentProblem();
    return problem ? this.clockService.getTimeOfDayLabel(problem.timeOfDay) : '';
  });

  readonly typeCorrectCount = computed(() => {
    const types = this.stats.statsByType();
    let total = 0;
    for (const type of this.selectedTypes()) {
      total += types[`clock-${type}`]?.correct ?? 0;
    }
    return total;
  });

  readonly typeIncorrectCount = computed(() => {
    const types = this.stats.statsByType();
    let total = 0;
    for (const type of this.selectedTypes()) {
      total += types[`clock-${type}`]?.incorrect ?? 0;
    }
    return total;
  });

  readonly typeTotalCount = computed(() => this.typeCorrectCount() + this.typeIncorrectCount());

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
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  generateProblem(): void {
    // Select random type from selected types
    const selected = Array.from(this.selectedTypes());
    if (selected.length === 0) return;

    const type = selected[Math.floor(Math.random() * selected.length)];
    this.currentType.set(type);

    const problem = this.clockService.generateProblem(type);
    this.currentProblem.set(problem);
    this.userAnswer.set('');
    this.showFeedback.set(false);
  }

  toggleType(type: ClockExerciseType): void {
    if (this.mode() === 'timeTrial') {
      // Time trial mode: only one type can be selected
      this.selectedTypes.set(new Set([type]));
    } else {
      // Practice mode: multi-select allowed
      const current = new Set(this.selectedTypes());
      if (current.has(type)) {
        // Don't allow deselecting if it's the only one selected
        if (current.size > 1) {
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
      // Practice mode - existing logic
      // Update streak
      if (correct) {
        const newStreak = this.streak() + 1;
        this.streak.set(newStreak);

        // Update best streak
        if (newStreak > this.bestStreak()) {
          this.bestStreak.set(newStreak);
        }

        // Check for milestone
        if (this.streakMilestones.includes(newStreak)) {
          this.milestoneValue.set(newStreak);
          this.confettiX = Array.from({ length: 20 }, () => Math.random() * 100);
          this.showMilestone.set(true);
          setTimeout(() => this.showMilestone.set(false), 2000);
        }
      } else {
        this.streak.set(0); // Reset streak on wrong answer
      }

      // Record stats with type prefix "clock-"
      const exerciseType = `clock-${this.currentType()}`;
      this.stats.recordResult(correct, exerciseType);

      // Auto-advance after delay
      const delay = correct ? 1000 : 2000;
      setTimeout(() => {
        this.generateProblem();
      }, delay);
    }
  }

  startTimeTrial(): void {
    this.timeRemaining.set(60);
    this.timeTrialCorrect.set(0);
    this.timeTrialTotal.set(0);
    this.timeTrialActive.set(true);
    this.showTimeTrialResults.set(false);
    this.isNewPersonalBest.set(false);
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

  // Handle number pad clicks
  addDigit(digit: string): void {
    const current = this.userAnswer();

    // Auto-format with colon
    if (current.length === 2 && !current.includes(':')) {
      this.userAnswer.set(current + ':' + digit);
    } else if (current.length < 5) {
      this.userAnswer.set(current + digit);
    }
  }

  backspace(): void {
    const current = this.userAnswer();
    this.userAnswer.set(current.slice(0, -1));
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.showFeedback()) {
      this.submitAnswer();
    } else if (event.key === 'Backspace') {
      this.backspace();
    } else if (/^\d$/.test(event.key)) {
      this.addDigit(event.key);
      event.preventDefault();
    }
  }
}
