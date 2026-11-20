import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  effect,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  WordProblem,
  WordProblemType,
  isTwoStepProblem,
} from '../../models/word-problem.model';
import { WordProblemService } from '../../services/word-problem.service';
import { PendingWordProblemService } from '../../services/pending-word-problem.service';
import {
  DifficultyService,
  DIFFICULTY_STREAK_UP,
  DIFFICULTY_TIERS,
} from '../../services/difficulty.service';
import { StatsService } from '../../services/stats.service';
import { ExerciseStateService } from '../../services/exercise-state.service';
import { KeypadComponent } from '../shared/keypad/keypad.component';
import {
  ExerciseStatusCardComponent,
  ExerciseDifficultyView,
} from '../shared/exercise-status-card/exercise-status-card.component';

const DIFF_TYPE = 'wordProblems' as const;
const STATS_KEY = 'word-problems';

@Component({
  standalone: true,
  selector: 'app-word-problem-exercise',
  imports: [RouterLink, KeypadComponent, ExerciseStatusCardComponent],
  templateUrl: './word-problem-exercise.component.html',
  styleUrl: './word-problem-exercise.component.scss',
  providers: [ExerciseStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordProblemExerciseComponent implements OnInit, OnDestroy {
  currentProblem = signal<WordProblem | null>(null);
  userAnswer = signal('');
  feedback = signal<'idle' | 'correct' | 'incorrect'>('idle');
  showCorrectAnswer = signal(false);

  private wordProblemService = inject(WordProblemService);
  private pendingProblem = inject(PendingWordProblemService);
  private difficulty = inject(DifficultyService);
  private stats = inject(StatsService);
  private exerciseState = inject(ExerciseStateService);

  readonly streak = this.exerciseState.streak;
  readonly bestStreak = this.exerciseState.bestStreak;
  readonly showMilestone = this.exerciseState.showMilestone;
  readonly milestoneValue = this.exerciseState.milestoneValue;
  readonly confettiPieces = this.exerciseState.confettiPieces;
  get confettiX() {
    return this.exerciseState.confettiX;
  }

  readonly streakUpNeeded = DIFFICULTY_STREAK_UP;
  currentType = signal<WordProblemType>('addition');

  levelFlash = signal<'up' | 'down' | null>(null);
  levelUpInfo = signal<{
    fromEmoji: string;
    fromName: string;
    emoji: string;
    name: string;
    direction: 'up' | 'down';
  } | null>(null);
  private levelUpTimer: ReturnType<typeof setTimeout> | null = null;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  readonly difficultyTier = computed(() => this.difficulty.getTier(DIFF_TYPE));
  readonly difficultyLevel = computed(() => this.difficulty.getLevel(DIFF_TYPE));
  readonly difficultyMax = computed(() => this.difficulty.getMaxLevel(DIFF_TYPE));
  readonly difficultyStreak = computed(() => this.difficulty.getState(DIFF_TYPE).streak);
  readonly nextDifficultyTier = computed(() => {
    const next = this.difficultyLevel() + 1;
    if (next > this.difficultyMax()) return null;
    return DIFFICULTY_TIERS[Math.min(next, DIFFICULTY_TIERS.length) - 1];
  });

  readonly statusDifficulty = computed((): ExerciseDifficultyView => {
    const tier = this.difficultyTier();
    const next = this.nextDifficultyTier();
    return {
      emoji: tier.emoji,
      name: tier.name,
      level: this.difficultyLevel(),
      maxLevel: this.difficultyMax(),
      streak: this.difficultyStreak(),
      streakUpNeeded: this.streakUpNeeded,
      nextEmoji: next?.emoji ?? null,
      nextName: next?.name ?? null,
      flash: this.levelFlash(),
    };
  });

  constructor() {
    this.exerciseState.setMilestones([5, 10, 20, 30, 40, 50, 75, 100]);

    effect(() => {
      const ev = this.difficulty.lastLevelUp();
      if (!ev || ev.type !== DIFF_TYPE) return;
      this.difficulty.clearLastLevelUp();
      const from = this.difficulty.getTierForLevel(ev.fromLevel);
      const to = this.difficulty.getTierForLevel(ev.level);
      this.showLevelNotification(from.emoji, from.name, to.emoji, to.name, 'up');
    });

    effect(() => {
      const ev = this.difficulty.lastLevelDown();
      if (!ev || ev.type !== DIFF_TYPE) return;
      this.difficulty.clearLastLevelDown();
      const from = this.difficulty.getTierForLevel(ev.fromLevel);
      const to = this.difficulty.getTierForLevel(ev.level);
      this.showLevelNotification(from.emoji, from.name, to.emoji, to.name, 'down');
    });

    if (!this.restorePendingProblem()) {
      this.generateProblem();
    }
  }

  ngOnInit(): void {
    localStorage.removeItem('wordProblemCurrentStreak');
    localStorage.removeItem('wordProblemRange');
    this.exerciseState.bestStreak.set(this.stats.getBestStreak(STATS_KEY));
  }

  ngOnDestroy(): void {
    this.exerciseState.reset();
    if (this.levelUpTimer) clearTimeout(this.levelUpTimer);
    if (this.flashTimer) clearTimeout(this.flashTimer);
  }

  storyText = computed(() => this.currentProblem()?.storyText ?? '');

  storyIcon = computed(() => {
    const problem = this.currentProblem();
    if (!problem) return '📝';
    if (isTwoStepProblem(problem)) return problem.icon;
    return this.wordProblemService.getTemplateIcon(problem.templateId);
  });

  correctAnswer = computed(() => this.currentProblem()?.correctAnswer ?? 0);

  isTwoStep = computed(() => isTwoStepProblem(this.currentProblem()));

  keypadDisabled = computed(() => this.feedback() !== 'idle');

  wordProblemCorrectCount = computed(() => {
    const types = this.stats.statsByType();
    return types[STATS_KEY]?.correct ?? 0;
  });

  wordProblemIncorrectCount = computed(() => {
    const types = this.stats.statsByType();
    return types[STATS_KEY]?.incorrect ?? 0;
  });

  generateProblem() {
    const level = this.difficulty.getLevel(DIFF_TYPE);
    const problem = this.wordProblemService.generateForLevel(level);
    this.currentProblem.set(problem);
    this.currentType.set(problem.type);

    this.userAnswer.set('');
    this.feedback.set('idle');
    this.showCorrectAnswer.set(false);
    this.pendingProblem.save(problem);
  }

  /** Restore pending Sachaufgabe from localStorage. Returns true if restored. */
  private restorePendingProblem(): boolean {
    const pending = this.pendingProblem.load();
    if (!pending) return false;

    if (typeof pending.playerLevel === 'number') {
      this.difficulty.ensureAtLeast(DIFF_TYPE, pending.playerLevel);
    }

    this.currentProblem.set(pending);
    this.currentType.set(pending.type);
    this.userAnswer.set('');
    this.feedback.set('idle');
    this.showCorrectAnswer.set(false);
    return true;
  }

  submitAnswer() {
    if (this.feedback() !== 'idle') return;
    const problem = this.currentProblem();
    if (!problem) return;

    const userInputValue = this.userAnswer();
    if (userInputValue === '') return;

    const parsed = Number(userInputValue);
    const isCorrect =
      Number.isFinite(parsed) && Number.isInteger(parsed) && parsed === this.correctAnswer();
    this.applyResult(isCorrect);
  }

  private applyResult(isCorrect: boolean) {
    this.feedback.set(isCorrect ? 'correct' : 'incorrect');
    if (!isCorrect) {
      this.showCorrectAnswer.set(true);
    }

    this.pendingProblem.clear();

    this.difficulty.recordResult(DIFF_TYPE, isCorrect);
    this.stats.recordResult(isCorrect, STATS_KEY);
    this.exerciseState.handleResult(isCorrect, () => this.generateProblem(), 800, 1200);

    const leveled =
      this.difficulty.lastLevelUp()?.type === DIFF_TYPE ||
      this.difficulty.lastLevelDown()?.type === DIFF_TYPE;
    if (leveled) {
      this.exerciseState.clearMilestone();
    }

    if (isCorrect) {
      this.stats.updateBestStreak(STATS_KEY, this.exerciseState.streak());
    }
  }

  private showLevelNotification(
    fromEmoji: string,
    fromName: string,
    emoji: string,
    name: string,
    direction: 'up' | 'down'
  ): void {
    this.exerciseState.clearMilestone();
    if (this.levelUpTimer) clearTimeout(this.levelUpTimer);
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.levelFlash.set(direction);
    this.levelUpInfo.set({ fromEmoji, fromName, emoji, name, direction });
    this.flashTimer = setTimeout(() => this.levelFlash.set(null), 600);
    this.levelUpTimer = setTimeout(() => this.levelUpInfo.set(null), 2500);
  }
}
