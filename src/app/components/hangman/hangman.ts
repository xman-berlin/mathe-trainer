import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DeutschService } from '../../services/vocab.service';
import { StatsService } from '../../services/stats.service';
import { AuthService } from '../../services/auth.service';
import { ExerciseStateService } from '../../services/exercise-state.service';
import { LetterSelectorComponent } from '../shared/letter-selector/letter-selector.component';
import type { VocabSessionWord } from '../../models/vocab.model';

const EXERCISE_TYPE = 'deutsch-hangman';
const MAX_WRONG = 6;

@Component({
  selector: 'app-deutsch-hangman',
  standalone: true,
  imports: [LetterSelectorComponent, RouterLink],
  templateUrl: './hangman.html',
  styleUrls: ['./hangman.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ExerciseStateService],
})
export class DeutschHangmanComponent implements OnInit {
  private deutschService = inject(DeutschService);
  protected statsService = inject(StatsService);
  private authService = inject(AuthService);
  protected exerciseState = inject(ExerciseStateService);

  // --- State ---
  readonly currentWord = signal<VocabSessionWord | null>(null);
  readonly guessedLetters = signal<Set<string>>(new Set());
  readonly wrongGuesses = signal(0);
  readonly feedback = signal<'correct' | 'incorrect' | null>(null);
  readonly isLoading = signal(true);
  readonly sessionEmpty = signal(false);
  readonly keypadDisabled = signal(false);

  // --- Session ---
  private queue: VocabSessionWord[] = [];
  private currentIndex = 0;
  private lastWordId: string | null = null;

  /** Override in tests for faster advance. */
  advanceDelay = 1500;
  lossAdvanceDelay = 2500;

  // --- Streak & milestone ---
  readonly streak = this.exerciseState.streak;
  readonly bestStreak = this.exerciseState.bestStreak;
  readonly showMilestone = this.exerciseState.showMilestone;
  readonly milestoneValue = this.exerciseState.milestoneValue;
  readonly confettiPieces = this.exerciseState.confettiPieces;
  readonly confettiX = this.exerciseState.confettiX;

  // --- Daily stats ---
  readonly typeCorrectCount = computed(
    () => this.statsService.statsByType()[EXERCISE_TYPE]?.correct ?? 0
  );
  readonly typeIncorrectCount = computed(
    () => this.statsService.statsByType()[EXERCISE_TYPE]?.incorrect ?? 0
  );
  readonly typeTotalCount = computed(
    () => this.typeCorrectCount() + this.typeIncorrectCount()
  );

  // --- Computed hangman state ---
  readonly displayLetters = computed(() => {
    const word = this.currentWord();
    if (!word) return [];
    const guessed = this.guessedLetters();
    return word.word.toUpperCase().split('').map(ch => guessed.has(ch) ? ch : '_');
  });

  readonly isWordComplete = computed(() => {
    return this.displayLetters().length > 0 && this.displayLetters().every(ch => ch !== '_');
  });

  readonly isGameOver = computed(() => this.wrongGuesses() >= MAX_WRONG);

  // --- Progress ---
  readonly answeredCount = signal(0);

  // --- Caterpillar segments visibility ---
  readonly segmentsLost = computed(() => this.wrongGuesses());

  async ngOnInit(): Promise<void> {
    const userId = this.authService.currentUser()?.id;

    if (!userId) {
      this.sessionEmpty.set(true);
      this.isLoading.set(false);
      return;
    }

    await this.deutschService.loadUserData(userId);

    try {
      this.queue = await this.deutschService.buildSession(userId);
    } catch {
      this.queue = [];
    }

    if (this.queue.length === 0) {
      this.sessionEmpty.set(true);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(false);
    this.showNextWord();
  }

  // ============================================================================
  // WORD NAVIGATION
  // ============================================================================

  private showNextWord(): void {
    // Find next word that's not the same as the last one
    let attempts = 0;
    let word: VocabSessionWord;
    do {
      if (this.currentIndex >= this.queue.length) {
        this.currentIndex = 0;
      }
      word = this.queue[this.currentIndex];
      this.currentIndex++;
      attempts++;
    } while (word.wordId === this.lastWordId && attempts < this.queue.length);

    this.lastWordId = word.wordId;
    this.currentWord.set(word);
    this.guessedLetters.set(new Set());
    this.wrongGuesses.set(0);
    this.feedback.set(null);
    this.keypadDisabled.set(false);
  }

  // ============================================================================
  // LETTER GUESSING
  // ============================================================================

  onLetterSelected(letter: string): void {
    const word = this.currentWord();
    if (!word || this.keypadDisabled()) return;

    const upperLetter = letter.toUpperCase();
    const wordUpper = word.word.toUpperCase();

    if (wordUpper.includes(upperLetter)) {
      const guessed = this.guessedLetters();

      // Already guessed correctly — ignore
      if (guessed.has(upperLetter)) return;

      // Correct guess — add to set
      const newGuessed = new Set(guessed);
      newGuessed.add(upperLetter);
      this.guessedLetters.set(newGuessed);

      if (this.isWordComplete()) {
        this.handleWin();
      }
    } else {
      // Wrong guess — always count
      const newWrong = this.wrongGuesses() + 1;
      this.wrongGuesses.set(newWrong);

      if (newWrong >= MAX_WRONG) {
        this.handleLoss();
      }
    }
  }

  private handleWin(): void {
    this.feedback.set('correct');
    this.keypadDisabled.set(true);
    this.answeredCount.update(n => n + 1);

    this.statsService.recordResult(true, EXERCISE_TYPE);

    this.exerciseState.handleResult(true, () => this.showNextWord(), this.advanceDelay, 2000);
  }

  private handleLoss(): void {
    this.feedback.set('incorrect');
    this.keypadDisabled.set(true);

    this.statsService.recordResult(false, EXERCISE_TYPE);

    this.exerciseState.handleResult(false, () => this.showNextWord(), 1500, this.lossAdvanceDelay);
  }
}
