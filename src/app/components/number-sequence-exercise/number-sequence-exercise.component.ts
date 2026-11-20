import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  effect,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  NumberSequenceGeneratorService,
  NumberSequenceProblem,
} from '../../services/number-sequence-generator.service';
import { PendingNumberSequenceService } from '../../services/pending-number-sequence.service';
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

const STATS_KEY = 'number-sequences';
const DIFF_TYPE = 'numberSequences' as const;
const STREAK_STORAGE_KEY = 'schlaufuchs-number-sequence-streak';

@Component({
  standalone: true,
  selector: 'app-number-sequence-exercise',
  imports: [RouterLink, KeypadComponent, ExerciseStatusCardComponent],
  templateUrl: './number-sequence-exercise.component.html',
  styleUrl: './number-sequence-exercise.component.scss',
  providers: [ExerciseStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumberSequenceExerciseComponent implements OnInit, OnDestroy {
  private readonly generator = inject(NumberSequenceGeneratorService);
  private readonly pending = inject(PendingNumberSequenceService);
  private readonly difficulty = inject(DifficultyService);
  private readonly stats = inject(StatsService);
  private readonly exerciseState = inject(ExerciseStateService);

  readonly streakUpNeeded = DIFFICULTY_STREAK_UP;

  currentProblem = signal<NumberSequenceProblem | null>(null);
  /** Answers parallel to gapIndices */
  gapAnswers = signal<string[]>([]);
  /** Index into gapIndices (not into terms) */
  activeGapSlot = signal(0);
  feedback = signal<'idle' | 'correct' | 'incorrect' | 'incomplete'>('idle');
  showCorrect = signal(false);
  fillHint = signal(false);

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

  readonly streak = this.exerciseState.streak;
  readonly bestStreak = this.exerciseState.bestStreak;
  readonly showMilestone = this.exerciseState.showMilestone;
  readonly milestoneValue = this.exerciseState.milestoneValue;
  readonly confettiPieces = this.exerciseState.confettiPieces;
  get confettiX() {
    return this.exerciseState.confettiX;
  }

  readonly difficultyTier = computed(() => this.difficulty.getTier(DIFF_TYPE));
  readonly difficultyLevel = computed(() => this.difficulty.getLevel(DIFF_TYPE));
  readonly difficultyMax = computed(() => this.difficulty.getMaxLevel(DIFF_TYPE));
  readonly difficultyStreak = computed(() => this.difficulty.getState(DIFF_TYPE).streak);
  readonly isMaxDifficulty = computed(() => this.difficultyLevel() >= this.difficultyMax());
  readonly nextDifficultyTier = computed(() => {
    const next = this.difficultyLevel() + 1;
    if (next > this.difficultyMax()) return null;
    return DIFFICULTY_TIERS[Math.min(next, DIFFICULTY_TIERS.length) - 1];
  });
  readonly levelProgressDots = computed(() => {
    const streak = this.difficultyStreak();
    return Array.from({ length: DIFFICULTY_STREAK_UP }, (_, i) => i < streak);
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

  readonly correctCount = computed(() => this.stats.statsByType()[STATS_KEY]?.correct ?? 0);
  readonly incorrectCount = computed(() => this.stats.statsByType()[STATS_KEY]?.incorrect ?? 0);

  readonly activeAnswer = computed(() => {
    const answers = this.gapAnswers();
    const slot = this.activeGapSlot();
    return answers[slot] ?? '';
  });

  readonly keypadDisabled = computed(() => this.feedback() === 'correct');

  readonly displayTerms = computed(() => {
    const problem = this.currentProblem();
    if (!problem) return [] as { value: string; isGap: boolean; gapSlot: number; termIndex: number }[];
    const gapSlots = new Map(problem.gapIndices.map((gi, slot) => [gi, slot]));
    const answers = this.gapAnswers();
    const showCorrect = this.showCorrect();

    return problem.terms.map((term, termIndex) => {
      const gapSlot = gapSlots.get(termIndex);
      if (gapSlot === undefined) {
        return { value: String(term), isGap: false, gapSlot: -1, termIndex };
      }
      if (showCorrect) {
        return { value: String(term), isGap: true, gapSlot, termIndex };
      }
      const draft = answers[gapSlot] ?? '';
      return {
        value: draft === '' ? '?' : draft,
        isGap: true,
        gapSlot,
        termIndex,
      };
    });
  });

  constructor() {
    this.exerciseState.setMilestones([5, 10, 20, 30, 40, 50, 75, 100]);
    this.restoreStreak();

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

    if (!this.restorePending()) {
      this.generateProblem();
    }
  }

  ngOnInit(): void {
    const best = Math.max(this.stats.getBestStreak(STATS_KEY), this.exerciseState.bestStreak());
    this.exerciseState.bestStreak.set(best);
  }

  ngOnDestroy(): void {
    this.persistStreak();
    this.exerciseState.reset();
    if (this.levelUpTimer) clearTimeout(this.levelUpTimer);
    if (this.flashTimer) clearTimeout(this.flashTimer);
  }

  selectGapSlot(slot: number): void {
    if (this.feedback() === 'correct') return;
    const problem = this.currentProblem();
    if (!problem || slot < 0 || slot >= problem.gapIndices.length) return;
    this.activeGapSlot.set(slot);
    this.feedback.set('idle');
    this.showCorrect.set(false);
    this.fillHint.set(false);
    this.persist();
  }

  onKeypadValue(value: string): void {
    if (this.keypadDisabled()) return;
    const slot = this.activeGapSlot();
    const next = [...this.gapAnswers()];
    next[slot] = value;
    this.gapAnswers.set(next);
    this.feedback.set('idle');
    this.showCorrect.set(false);
    this.fillHint.set(false);
    this.persist();
  }

  onKeypadSubmit(): void {
    if (this.keypadDisabled()) return;
    const problem = this.currentProblem();
    if (!problem) return;

    const answers = this.gapAnswers();
    const emptySlot = answers.findIndex((a) => a.trim() === '');
    if (emptySlot !== -1) {
      this.activeGapSlot.set(emptySlot);
      this.fillHint.set(true);
      this.persist();
      return;
    }

    this.checkAnswers();
  }

  isGapWrong(gapSlot: number): boolean {
    if (this.feedback() !== 'incorrect' || !this.showCorrect()) return false;
    const problem = this.currentProblem();
    if (!problem) return false;
    const expected = problem.terms[problem.gapIndices[gapSlot]];
    const parsed = Number(this.gapAnswers()[gapSlot]);
    return parsed !== expected;
  }

  private checkAnswers(): void {
    const problem = this.currentProblem();
    if (!problem) return;

    const answers = this.gapAnswers();
    let allCorrect = true;
    for (let i = 0; i < problem.gapIndices.length; i++) {
      const expected = problem.terms[problem.gapIndices[i]];
      const parsed = Number(answers[i]);
      if (!Number.isInteger(parsed) || parsed !== expected) {
        allCorrect = false;
        break;
      }
    }

    this.applyResult(allCorrect);
  }

  private applyResult(isCorrect: boolean): void {
    this.feedback.set(isCorrect ? 'correct' : 'incorrect');
    this.fillHint.set(false);
    if (!isCorrect) {
      this.showCorrect.set(true);
    }

    this.pending.clear();
    this.difficulty.recordResult(DIFF_TYPE, isCorrect);
    this.stats.recordResult(isCorrect, STATS_KEY);
    this.exerciseState.handleResult(isCorrect, () => this.generateProblem(), 800, 1400);

    // Level-change and streak-milestone both fire every 5 correct — keep only the level toast
    const leveled =
      this.difficulty.lastLevelUp()?.type === DIFF_TYPE ||
      this.difficulty.lastLevelDown()?.type === DIFF_TYPE;
    if (leveled) {
      this.exerciseState.clearMilestone();
    }

    if (isCorrect) {
      this.stats.updateBestStreak(STATS_KEY, this.exerciseState.streak());
    }
    this.persistStreak();
  }

  private generateProblem(): void {
    const level = this.difficulty.getLevel(DIFF_TYPE);
    const problem = this.generator.generate(level);
    this.currentProblem.set(problem);
    this.gapAnswers.set(problem.gapIndices.map(() => ''));
    this.activeGapSlot.set(0);
    this.feedback.set('idle');
    this.showCorrect.set(false);
    this.fillHint.set(false);
    this.persist();
  }

  private restorePending(): boolean {
    const data = this.pending.load();
    if (!data) return false;
    // Pending problem may outlive a wiped difficulty (empty DB load) — restore tier
    if (typeof data.problem.level === 'number') {
      this.difficulty.ensureAtLeast(DIFF_TYPE, data.problem.level);
    }
    this.currentProblem.set(data.problem);
    this.gapAnswers.set([...data.gapAnswers]);
    this.activeGapSlot.set(data.activeGapIndex);
    this.feedback.set('idle');
    this.showCorrect.set(false);
    this.fillHint.set(false);
    return true;
  }

  private restoreStreak(): void {
    try {
      const raw = localStorage.getItem(STREAK_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { streak?: number; bestStreak?: number };
      const streak = Number.isInteger(parsed.streak) ? Math.max(0, parsed.streak as number) : 0;
      const best = Number.isInteger(parsed.bestStreak) ? Math.max(0, parsed.bestStreak as number) : 0;
      this.exerciseState.streak.set(streak);
      this.exerciseState.bestStreak.set(Math.max(best, streak));
    } catch {
      // ignore
    }
  }

  private persistStreak(): void {
    try {
      localStorage.setItem(
        STREAK_STORAGE_KEY,
        JSON.stringify({
          streak: this.exerciseState.streak(),
          bestStreak: this.exerciseState.bestStreak(),
        })
      );
    } catch {
      // ignore
    }
  }

  private persist(): void {
    const problem = this.currentProblem();
    if (!problem) return;
    this.pending.save({
      problem,
      gapAnswers: [...this.gapAnswers()],
      activeGapIndex: this.activeGapSlot(),
    });
  }

  private showLevelNotification(
    fromEmoji: string,
    fromName: string,
    emoji: string,
    name: string,
    direction: 'up' | 'down'
  ): void {
    // Level toast wins over the streak milestone (both fire every 5 correct)
    this.exerciseState.clearMilestone();
    if (this.levelUpTimer) clearTimeout(this.levelUpTimer);
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.levelFlash.set(direction);
    this.levelUpInfo.set({ fromEmoji, fromName, emoji, name, direction });
    this.flashTimer = setTimeout(() => this.levelFlash.set(null), 600);
    this.levelUpTimer = setTimeout(() => this.levelUpInfo.set(null), 2500);
  }
}
