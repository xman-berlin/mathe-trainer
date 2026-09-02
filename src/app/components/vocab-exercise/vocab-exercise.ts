import {
  Component,
  OnInit,
  OnDestroy,
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
import { LetterKeypadComponent } from '../shared/letter-keypad/letter-keypad.component';
import type { VocabSessionWord } from '../../models/vocab.model';

const EXERCISE_TYPE = 'deutsch-rechtschreibung';
const SPEECH_LANG = 'de-DE';

@Component({
  selector: 'app-deutsch-rechtschreibung',
  standalone: true,
  imports: [LetterKeypadComponent, RouterLink],
  templateUrl: './vocab-exercise.html',
  styleUrls: ['./vocab-exercise.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ExerciseStateService],
})
export class DeutschRechtschreibungComponent implements OnInit, OnDestroy {
  private deutschService = inject(DeutschService);
  protected statsService = inject(StatsService);
  private authService = inject(AuthService);
  protected exerciseState = inject(ExerciseStateService);

  // --- State ---
  readonly userAnswer = signal('');
  readonly feedback = signal<'correct' | 'incorrect' | null>(null);
  readonly correctAnswer = signal('');
  readonly isLoading = signal(true);
  readonly sessionEmpty = signal(false);
  readonly keypadDisabled = signal(false);

  // --- Session ---
  private queue: VocabSessionWord[] = [];
  private currentIndex = 0;

  readonly currentWord = signal<VocabSessionWord | null>(null);

  // --- Streak & milestone (from ExerciseStateService) ---
  readonly streak = this.exerciseState.streak;
  readonly bestStreak = this.exerciseState.bestStreak;
  readonly showMilestone = this.exerciseState.showMilestone;
  readonly milestoneValue = this.exerciseState.milestoneValue;
  readonly confettiPieces = this.exerciseState.confettiPieces;
  readonly confettiX = this.exerciseState.confettiX;

  // --- Daily stats for result-summary ---
  readonly typeCorrectCount = computed(
    () => this.statsService.statsByType()[EXERCISE_TYPE]?.correct ?? 0
  );
  readonly typeIncorrectCount = computed(
    () => this.statsService.statsByType()[EXERCISE_TYPE]?.incorrect ?? 0
  );
  readonly typeTotalCount = computed(
    () => this.typeCorrectCount() + this.typeIncorrectCount()
  );

  // --- Progress ---
  readonly answeredCount = signal(0);

  private utterance: SpeechSynthesisUtterance | null = null;

  async ngOnInit(): Promise<void> {
    const userId = this.authService.currentUser()?.id;

    if (!userId) {
      this.sessionEmpty.set(true);
      this.isLoading.set(false);
      return;
    }

    // Always refresh assignments from DB — they may have changed since login.
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
    this.showCurrentWord();
  }

  ngOnDestroy(): void {
    speechSynthesis.cancel();
    this.exerciseState.reset();
  }

  // ============================================================================
  // WORD NAVIGATION
  // ============================================================================

  private showCurrentWord(): void {
    if (this.currentIndex >= this.queue.length) {
      this.currentIndex = 0;
    }
    const word = this.queue[this.currentIndex];
    this.currentWord.set(word);
    this.userAnswer.set('');
    this.feedback.set(null);
    this.correctAnswer.set('');
    this.keypadDisabled.set(false);
    this.playWord();
  }

  // ============================================================================
  // SPEECH
  // ============================================================================

  playWord(): void {
    const word = this.currentWord();
    if (!word) return;

    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(word.word);
    utt.lang = SPEECH_LANG;
    utt.rate = 0.85;
    this.utterance = utt;
    speechSynthesis.speak(utt);
  }

  // ============================================================================
  // ANSWER HANDLING
  // ============================================================================

  submitAnswer(): void {
    const word = this.currentWord();
    if (!word || this.keypadDisabled()) return;

    const answer = this.userAnswer().trim().toLowerCase();
    const expected = word.word.trim().toLowerCase();
    const isCorrect = answer === expected;

    this.feedback.set(isCorrect ? 'correct' : 'incorrect');
    this.keypadDisabled.set(true);

    if (!isCorrect) {
      this.correctAnswer.set(word.word);
    }

    // Record stats
    this.statsService.recordResult(isCorrect, EXERCISE_TYPE);

    // Update word weight optimistically (non-blocking)
    const userId = this.authService.currentUser()?.id;
    if (userId) {
      this.deutschService.updateWordWeight(userId, word.wordId, isCorrect);
    }

    if (isCorrect) {
      this.answeredCount.update(n => n + 1);
    }

    // Use ExerciseStateService for streak/milestones, then advance
    this.exerciseState.handleResult(isCorrect, () => this.advance(), 1000, 2000);
  }

  private advance(): void {
    this.currentIndex++;
    if (this.currentIndex >= this.queue.length) {
      // Queue exhausted — rebuild with updated weights
      const userId = this.authService.currentUser()?.id;
      if (userId) {
        void Promise.resolve(this.deutschService.buildSession(userId)).then((queue) => {
          if (queue.length === 0) {
            this.sessionEmpty.set(true);
            return;
          }
          this.queue = queue;
          this.currentIndex = 0;
          this.showCurrentWord();
        });
        return;
      }
      this.sessionEmpty.set(true);
      return;
    }
    this.showCurrentWord();
  }
}
