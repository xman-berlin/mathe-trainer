import { Component, ElementRef, ViewChild, signal, AfterViewInit, ChangeDetectionStrategy, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StatsService } from '../../services/stats.service';
import { AchievementsService } from '../../services/achievements.service';
import { TimedChallengeService } from '../../services/timed-challenge.service';
import { KeypadComponent } from '../shared/keypad/keypad.component';

type ExerciseType = 'addition' | 'subtraction' | 'multiplication' | 'division';

@Component({
  standalone: true,
  selector: 'app-exercise',
  imports: [RouterLink, KeypadComponent],
  templateUrl: './exercise.component.html',
  styleUrls: ['./exercise.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExerciseComponent implements AfterViewInit, OnDestroy, OnInit {
  operandA = signal(0);
  operandB = signal(0);
  userAnswer = signal('');
  feedback = signal<'idle' | 'correct' | 'incorrect'>('idle');
  showCorrectAnswer = signal(false);

  // Streak tracking
  streak = signal(0);
  bestStreak = signal(0);
  showMilestone = signal(false);
  milestoneValue = signal(0);
  private streakMilestones = [5, 10, 20, 30, 40, 50, 75, 100];

  // Confetti
  confettiPieces = Array.from({ length: 20 }, (_, i) => i);
  confettiX = Array.from({ length: 20 }, () => Math.random() * 100);

  selectedTypes = signal<Set<ExerciseType>>(new Set(['addition', 'subtraction', 'multiplication', 'division']));
  currentType = signal<ExerciseType>('addition');

  // Selected numbers for multiplication and division (empty = all, otherwise specific ones)
  selectedNumbers = signal<Set<number>>(new Set());
  numberOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Time Trial Mode
  readonly mode = signal<'practice' | 'timeTrial'>('practice');
  readonly timeTrialActive = signal(false);
  readonly timeRemaining = signal(60);
  readonly timeTrialCorrect = signal(0);
  readonly timeTrialTotal = signal(0);
  readonly showTimeTrialResults = signal(false);
  readonly isNewPersonalBest = signal(false);
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  @ViewChild('answerInput', { static: false }) answerInput?: ElementRef<HTMLInputElement>;

  private isInitialized = false;
  private stats = inject(StatsService);
  private achievements = inject(AchievementsService);
  private timedChallengeService = inject(TimedChallengeService);
  private route = inject(ActivatedRoute);

  constructor() {
    this.generateProblem();
  }

  ngOnInit(): void {
    // Set mode from route data
    const mode = this.route.snapshot.data['mode'] as 'practice' | 'timeTrial' | undefined;
    if (mode) {
      this.mode.set(mode);

      // In time trial mode: only one type allowed, start with addition
      if (mode === 'timeTrial') {
        this.selectedTypes.set(new Set(['addition']));
      }
    }
  }

  operatorSymbol = computed(() => {
    switch (this.currentType()) {
      case 'addition': return '+';
      case 'subtraction': return '−';
      case 'multiplication': return '×';
      case 'division': return '÷';
    }
  });

  correctAnswer = computed(() => {
    const a = this.operandA();
    const b = this.operandB();
    switch (this.currentType()) {
      case 'addition': return a + b;
      case 'subtraction': return a - b;
      case 'multiplication': return a * b;
      case 'division': return a / b;
    }
  });

  keypadDisabled = computed(() => this.feedback() !== 'idle');

  typeCorrectCount = computed(() => {
    const types = this.stats.statsByType();
    let total = 0;
    for (const type of this.selectedTypes()) {
      total += types[type]?.correct ?? 0;
    }
    return total;
  });

  typeIncorrectCount = computed(() => {
    const types = this.stats.statsByType();
    let total = 0;
    for (const type of this.selectedTypes()) {
      total += types[type]?.incorrect ?? 0;
    }
    return total;
  });

  typeTotalCount = computed(() => this.typeCorrectCount() + this.typeIncorrectCount());

  timeTrialAccuracy = computed(() => {
    const total = this.timeTrialTotal();
    return total > 0 ? Math.round((this.timeTrialCorrect() / total) * 100) : 0;
  });

  currentPersonalBest = computed(() => {
    const types = Array.from(this.selectedTypes());
    return this.timedChallengeService.getBestForTypes(types);
  });

  isTypeSelected(type: ExerciseType): boolean {
    return this.selectedTypes().has(type);
  }

  toggleNumber(value: number) {
    const current = this.selectedNumbers();
    const newSet = new Set(current);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    this.selectedNumbers.set(newSet);
    // Generate new problem if multiplication or division is active
    if (this.currentType() === 'multiplication' || this.currentType() === 'division') {
      this.generateProblem();
    }
  }

  isNumberSelected(value: number): boolean {
    return this.selectedNumbers().has(value);
  }

  allNumbersSelected(): boolean {
    return this.selectedNumbers().size === 0;
  }

  selectAllNumbers() {
    this.selectedNumbers.set(new Set());
    if (this.currentType() === 'multiplication' || this.currentType() === 'division') {
      this.generateProblem();
    }
  }

  toggleType(type: ExerciseType) {
    const current = this.selectedTypes();
    const newSet = new Set(current);

    if (this.mode() === 'timeTrial') {
      // Time trial mode: only one type at a time (radio behavior)
      if (!newSet.has(type)) {
        this.selectedTypes.set(new Set([type]));
        this.generateProblem();
      }
    } else {
      // Practice mode: multi-select
      if (newSet.has(type)) {
        if (newSet.size > 1) {
          newSet.delete(type);
          this.selectedTypes.set(newSet);
          // Generate new problem if current type was deselected
          if (this.currentType() === type) {
            this.generateProblem();
          }
        }
      } else {
        newSet.add(type);
        this.selectedTypes.set(newSet);
      }
    }
  }

  ngAfterViewInit() {
    this.isInitialized = true;
    setTimeout(() => this.focusInput(), 50);
  }

  generateProblem() {
    const types = Array.from(this.selectedTypes());
    const prevType = this.currentType();
    const prevA = this.operandA();
    const prevB = this.operandB();

    let type: ExerciseType;
    let a: number;
    let b: number;

    do {
      type = types[Math.floor(Math.random() * types.length)];

      if (type === 'addition') {
        // b is 1-10, tens crossing: (a % 10) + b > 10
        b = this.randomInt(1, 10);
        const minOnes = 11 - b;
        const maxOnes = 9;
        const ones = this.randomInt(minOnes, maxOnes);
        const maxTens = Math.floor((100 - b) / 10);
        const tens = this.randomInt(0, maxTens);
        a = tens * 10 + ones;
      } else if (type === 'subtraction') {
        // b is 1-10, tens crossing: (a % 10) < b, need to borrow
        b = this.randomInt(1, 10);
        const ones = this.randomInt(0, b - 1);
        const minTens = 1;
        const maxTens = 10;
        const tens = this.randomInt(minTens, maxTens);
        a = tens * 10 + ones;
      } else if (type === 'multiplication') {
        // Small multiplication table: 1-10 x 1-10
        // In time trial mode, always use all numbers
        const selected = this.mode() === 'timeTrial' ? new Set<number>() : this.selectedNumbers();
        if (selected.size > 0) {
          const numbers = Array.from(selected);
          a = this.randomInt(1, 10);
          b = numbers[Math.floor(Math.random() * numbers.length)];
        } else {
          a = this.randomInt(1, 10);
          b = this.randomInt(1, 10);
        }
      } else {
        // Division: b divides a evenly, both factors 1-10
        // In time trial mode, always use all numbers
        const selected = this.mode() === 'timeTrial' ? new Set<number>() : this.selectedNumbers();
        if (selected.size > 0) {
          const numbers = Array.from(selected);
          b = numbers[Math.floor(Math.random() * numbers.length)];
        } else {
          b = this.randomInt(1, 10);
        }
        const quotient = this.randomInt(1, 10);
        a = b * quotient;
      }
    } while (type === prevType && a === prevA && b === prevB);

    this.currentType.set(type);
    this.operandA.set(a);
    this.operandB.set(b);

    this.userAnswer.set('');
    this.feedback.set('idle');
    this.showCorrectAnswer.set(false);

    if (this.isInitialized) {
      setTimeout(() => this.focusInput(), 150);
    }
  }

  randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  submitAnswer() {
    const userInputValue = this.userAnswer();
    if (userInputValue === '') return;
    // Prevent multiple submissions while showing feedback
    if (this.feedback() !== 'idle') return;

    const parsed = Number(userInputValue);
    const isCorrect = Number.isFinite(parsed) && Number.isInteger(parsed) && parsed === this.correctAnswer();

    if (this.mode() === 'timeTrial' && this.timeTrialActive()) {
      // Time trial mode - track separately
      this.feedback.set(isCorrect ? 'correct' : 'incorrect');
      if (!isCorrect) {
        this.showCorrectAnswer.set(true);
      }

      this.timeTrialTotal.update(n => n + 1);
      if (isCorrect) {
        this.timeTrialCorrect.update(n => n + 1);
      }

      // Reduced delays for time trial
      const delay = isCorrect ? 300 : 600;
      setTimeout(() => {
        if (this.timeTrialActive()) {
          this.generateProblem();
        }
      }, delay);
    } else {
      // Practice mode - existing logic
      if (isCorrect) {
        this.feedback.set('correct');
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

        setTimeout(() => this.generateProblem(), 600);
      } else {
        this.feedback.set('incorrect');
        this.showCorrectAnswer.set(true);
        this.streak.set(0); // Reset streak on wrong answer
        setTimeout(() => this.generateProblem(), 1200);
      }

      this.stats.recordResult(isCorrect, this.currentType());

      // Track multiplication mastery
      if (this.currentType() === 'multiplication') {
        const reihe = this.operandB();
        this.achievements.recordMultiplicationResult(reihe, isCorrect);
      }
    }
  }

  focusInput() {
    if (!this.answerInput) return;
    try {
      const inputElement = this.answerInput.nativeElement;
      inputElement.focus();
      inputElement.select();
    } catch {
      // Silently ignore focus errors
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
      exerciseTypes: Array.from(this.selectedTypes()),
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

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}
