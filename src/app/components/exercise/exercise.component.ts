import { Component, ElementRef, ViewChild, signal, AfterViewInit, ChangeDetectionStrategy, computed, inject, OnDestroy, OnInit, effect } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StatsService } from '../../services/stats.service';
import { AchievementsService } from '../../services/achievements.service';
import { TimedChallengeService } from '../../services/timed-challenge.service';
import { ProblemGeneratorService, OperationType } from '../../services/problem-generator.service';
import { DifficultyService, DIFFICULTY_STREAK_UP } from '../../services/difficulty.service';
import type { DifficultyOperationType } from '../../models/user.model';
import { KeypadComponent } from '../shared/keypad/keypad.component';
import {
  ExerciseStatusCardComponent,
  ExerciseDifficultyView,
} from '../shared/exercise-status-card/exercise-status-card.component';
import { ExerciseStateService } from '../../services/exercise-state.service';
import { PracticePlanService } from '../../services/practice-plan.service';
import { PendingMathProblemService } from '../../services/pending-math-problem.service';
import { createStatsAggregator } from '../../utils/stats-aggregator';

type ExerciseType = 'addition' | 'subtraction' | 'multiplication' | 'division';

const ALL_MATH_TYPES = new Set<ExerciseType>([
  'addition',
  'subtraction',
  'multiplication',
  'division',
]);

@Component({
  standalone: true,
  selector: 'app-exercise',
  imports: [RouterLink, KeypadComponent, ExerciseStatusCardComponent],
  templateUrl: './exercise.component.html',
  styleUrls: ['./exercise.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ExerciseStateService],
})
export class ExerciseComponent implements AfterViewInit, OnDestroy, OnInit {
  operandA = signal(0);
  operandB = signal(0);
  userAnswer = signal('');
  feedback = signal<'idle' | 'correct' | 'incorrect'>('idle');
  showCorrectAnswer = signal(false);

  // Streak & confetti via shared service
  private exerciseState = inject(ExerciseStateService);
  readonly streak = this.exerciseState.streak;
  readonly bestStreak = this.exerciseState.bestStreak;
  readonly showMilestone = this.exerciseState.showMilestone;
  readonly milestoneValue = this.exerciseState.milestoneValue;
  readonly confettiPieces = this.exerciseState.confettiPieces;
  get confettiX() { return this.exerciseState.confettiX; }

  // Level-change notifications
  readonly showLevelUp = signal(false);
  readonly levelUpInfo = signal<{
    fromEmoji: string;
    fromName: string;
    emoji: string;
    name: string;
    direction: 'up' | 'down';
  } | null>(null);
  private levelUpTimer: ReturnType<typeof setTimeout> | null = null;
  /** Brief chip flash after level change: 'up' | 'down' | null */
  readonly levelFlash = signal<'up' | 'down' | null>(null);
  private levelFlashTimer: ReturnType<typeof setTimeout> | null = null;

  readonly streakUpNeeded = DIFFICULTY_STREAK_UP;

  constructor() {
    this.exerciseState.setMilestones([5, 10, 20, 30, 40, 50, 75, 100]);

    effect(() => {
      const ev = this.difficultyService.lastLevelUp();
      if (!ev) return;
      this.difficultyService.clearLastLevelUp();
      const from = this.difficultyService.getTierForLevel(ev.fromLevel);
      const to = this.difficultyService.getTierForLevel(ev.level);
      this._showLevelNotification(from.emoji, from.name, to.emoji, to.name, 'up');
    });

    effect(() => {
      const ev = this.difficultyService.lastLevelDown();
      if (!ev) return;
      this.difficultyService.clearLastLevelDown();
      const from = this.difficultyService.getTierForLevel(ev.fromLevel);
      const to = this.difficultyService.getTierForLevel(ev.level);
      this._showLevelNotification(from.emoji, from.name, to.emoji, to.name, 'down');
    });

    effect(() => {
      const locked = this.lockedTypes();
      if (locked.size === 0 || this.mode() !== 'practice') return;
      const current = this.selectedTypes();
      let changed = false;
      const next = new Set(current);
      for (const type of locked) {
        if (!next.has(type)) {
          next.add(type);
          changed = true;
        }
      }
      if (changed) {
        this.selectedTypes.set(next);
      }
    });
  }

  private _showLevelNotification(
    fromEmoji: string,
    fromName: string,
    emoji: string,
    name: string,
    direction: 'up' | 'down'
  ): void {
    if (this.levelUpTimer) clearTimeout(this.levelUpTimer);
    this.levelUpInfo.set({ fromEmoji, fromName, emoji, name, direction });
    this.showLevelUp.set(true);
    this.levelUpTimer = setTimeout(() => this.showLevelUp.set(false), 2800);

    if (this.levelFlashTimer) clearTimeout(this.levelFlashTimer);
    this.levelFlash.set(direction);
    this.levelFlashTimer = setTimeout(() => this.levelFlash.set(null), 900);
  }

  selectedTypes = signal<Set<ExerciseType>>(new Set(ALL_MATH_TYPES));
  currentType = signal<ExerciseType>('addition');

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
  readonly mathNumberRange = computed(() => this.stats.currentMathNumberRange());
  private achievements = inject(AchievementsService);
  private timedChallengeService = inject(TimedChallengeService);
  private problemGenerator = inject(ProblemGeneratorService);
  private difficultyService = inject(DifficultyService);
  private pendingProblem = inject(PendingMathProblemService);
  private route = inject(ActivatedRoute);
  protected practicePlan = inject(PracticePlanService);

  ngOnInit(): void {
    // Set mode from route data
    const mode = this.route.snapshot.data['mode'] as 'practice' | 'timeTrial' | undefined;
    if (mode) {
      this.mode.set(mode);

      // In time trial mode: only one type allowed, start with addition
      if (mode === 'timeTrial') {
        this.selectedTypes.set(new Set(['addition']));
      } else {
        // Practice: always auto-mix all four operations
        this.selectedTypes.set(new Set(ALL_MATH_TYPES));
      }
    }

    if (this.practicePlan.typesLocked()) {
      this.selectedTypes.set(new Set(ALL_MATH_TYPES));
    }

    // Practice: resume unsolved problem; time trial always starts fresh
    if (this.mode() === 'practice' && this.restorePendingProblem()) {
      return;
    }
    this.generateProblem();
  }

  /** Restore pending practice problem from localStorage. Returns true if restored. */
  private restorePendingProblem(): boolean {
    const pending = this.pendingProblem.load();
    if (!pending) return false;

    if (!this.isPendingCompatibleWithCurrentLevel(pending)) {
      this.pendingProblem.clear();
      return false;
    }

    const type = pending.operation as ExerciseType;
    if (!this.selectedTypes().has(type)) {
      const next = new Set(this.selectedTypes());
      next.add(type);
      this.selectedTypes.set(next);
    }

    this.currentType.set(type);
    this.operandA.set(pending.operandA);
    this.operandB.set(pending.operandB);
    this.userAnswer.set('');
    this.feedback.set('idle');
    this.showCorrectAnswer.set(false);
    return true;
  }

  /**
   * Drop stale pending tasks that no longer match the active difficulty
   * (e.g. old Drache-style 160+760 while +/− max is reine-Hunderter Löwe).
   */
  private isPendingCompatibleWithCurrentLevel(pending: {
    operation: string;
    operandA: number;
    operandB: number;
  }): boolean {
    const { operation, operandA: a, operandB: b } = pending;
    if (operation !== 'addition' && operation !== 'subtraction') {
      return true;
    }
    const level = this.difficultyService.getLevel(operation);
    if (level >= 5) {
      // Löwe+: reine Hunderter only
      return a % 100 === 0 && b % 100 === 0 && a >= 100 && b >= 100;
    }
    // Levels 1–4 stay in 1–100
    return a <= 100 && b <= 100;
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

  /** Difficulty chip for the current problem's operation (practice mode). */
  currentDifficultyTier = computed(() =>
    this.difficultyService.getTier(this.currentType() as DifficultyOperationType)
  );
  currentDifficultyLevel = computed(() =>
    this.difficultyService.getLevel(this.currentType() as DifficultyOperationType)
  );
  currentDifficultyMax = computed(() =>
    this.difficultyService.getMaxLevel(this.currentType() as DifficultyOperationType)
  );
  currentDifficultyStreak = computed(() =>
    this.difficultyService.getState(this.currentType() as DifficultyOperationType).streak
  );
  isMaxDifficulty = computed(
    () => this.currentDifficultyLevel() >= this.currentDifficultyMax()
  );
  nextDifficultyTier = computed(() => {
    const next = this.currentDifficultyLevel() + 1;
    if (next > this.currentDifficultyMax()) return null;
    return this.difficultyService.getTierForLevel(next);
  });
  levelProgressDots = computed(() => {
    const filled = Math.min(this.currentDifficultyStreak(), this.streakUpNeeded);
    return Array.from({ length: this.streakUpNeeded }, (_, i) => i < filled);
  });

  /** Unified status card difficulty (practice only). */
  readonly statusDifficulty = computed((): ExerciseDifficultyView | null => {
    if (this.mode() !== 'practice') return null;
    const tier = this.currentDifficultyTier();
    const next = this.nextDifficultyTier();
    return {
      emoji: tier.emoji,
      name: tier.name,
      level: this.currentDifficultyLevel(),
      maxLevel: this.currentDifficultyMax(),
      streak: this.currentDifficultyStreak(),
      streakUpNeeded: this.streakUpNeeded,
      nextEmoji: next?.emoji ?? null,
      nextName: next?.name ?? null,
      flash: this.levelFlash(),
    };
  });

  private statsAgg = createStatsAggregator(this.stats, this.selectedTypes);
  typeCorrectCount = this.statsAgg.correct;
  typeIncorrectCount = this.statsAgg.incorrect;
  typeTotalCount = this.statsAgg.total;

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

  readonly lockedTypes = computed(() => {
    const lifetime = this.stats.lifetimeStatsByType();
    return new Set<ExerciseType>(
      (['addition', 'subtraction', 'multiplication', 'division'] as ExerciseType[])
        .filter(t => (lifetime[t] ?? 0) >= 100)
    );
  });

  isTypeLocked(type: ExerciseType): boolean {
    return this.lockedTypes().has(type);
  }

  toggleType(type: ExerciseType) {
    if (this.practicePlan.typesLocked()) return;
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
        if (newSet.size > 1 && !this.isTypeLocked(type)) {
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
    const types = Array.from(this.selectedTypes()) as OperationType[];
    const prevType = this.currentType();
    const prevA = this.operandA();
    const prevB = this.operandB();

    let problem;

    // Generate until we get a different problem (anti-repetition)
    do {
      // Practice + time trial: always mix all Einmaleins rows (no Reihe filter in UI)
      problem = this.problemGenerator.generateProblem(types, undefined, {
          addition: this.difficultyService.getLevel('addition'),
          subtraction: this.difficultyService.getLevel('subtraction'),
          multiplication: this.difficultyService.getLevel('multiplication'),
          division: this.difficultyService.getLevel('division'),
        }, this.mathNumberRange());
    } while (
      problem.operation === prevType &&
      problem.operandA === prevA &&
      problem.operandB === prevB
    );

    this.currentType.set(problem.operation as ExerciseType);
    this.operandA.set(problem.operandA);
    this.operandB.set(problem.operandB);

    this.userAnswer.set('');
    this.feedback.set('idle');
    this.showCorrectAnswer.set(false);

    if (this.mode() === 'practice') {
      this.pendingProblem.save({
        operation: problem.operation,
        operandA: problem.operandA,
        operandB: problem.operandB,
      });
    }

    if (this.isInitialized) {
      setTimeout(() => this.focusInput(), 150);
    }
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
      // Practice mode — clear pending so leave-during-feedback does not re-ask the same task
      this.pendingProblem.clear();

      this.feedback.set(isCorrect ? 'correct' : 'incorrect');
      if (!isCorrect) this.showCorrectAnswer.set(true);
      this.exerciseState.handleResult(isCorrect, () => this.generateProblem());

      this.stats.recordResult(isCorrect, this.currentType());
      this.difficultyService.recordResult(this.currentType() as OperationType, isCorrect);

      const leveled =
        this.difficultyService.lastLevelUp() !== null ||
        this.difficultyService.lastLevelDown() !== null;
      if (leveled) {
        this.exerciseState.clearMilestone();
      }

      if (isCorrect) {
        this.practicePlan.recordCorrect('math');
      }

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
    if (this.levelUpTimer) clearTimeout(this.levelUpTimer);
    if (this.levelFlashTimer) clearTimeout(this.levelFlashTimer);
    this.exerciseState.reset();
  }
}
