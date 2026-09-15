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
import { EnglischService } from '../../services/englisch.service';
import { StatsService } from '../../services/stats.service';
import { AuthService } from '../../services/auth.service';
import { ExerciseStateService } from '../../services/exercise-state.service';
import { LetterKeypadComponent } from '../shared/letter-keypad/letter-keypad.component';
import type { VocabSessionWord } from '../../models/vocab.model';

const EXERCISE_TYPE = 'englisch-uebersetzung';

@Component({
  selector: 'app-englisch-uebung',
  standalone: true,
  imports: [LetterKeypadComponent, RouterLink],
  templateUrl: './englisch-uebung.html',
  styleUrl: '../vocab-exercise/vocab-exercise.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ExerciseStateService],
})
export class EnglischUebungComponent implements OnInit, OnDestroy {
  private englischService = inject(EnglischService);
  protected statsService = inject(StatsService);
  private authService = inject(AuthService);
  protected exerciseState = inject(ExerciseStateService);

  readonly userAnswer = signal('');
  readonly feedback = signal<'correct' | 'incorrect' | null>(null);
  readonly correctAnswer = signal('');
  readonly isLoading = signal(true);
  readonly sessionEmpty = signal(false);
  readonly keypadDisabled = signal(false);

  private queue: VocabSessionWord[] = [];
  private currentIndex = 0;
  private lastWordId: string | null = null;

  readonly currentWord = signal<VocabSessionWord | null>(null);

  readonly streak = this.exerciseState.streak;
  readonly bestStreak = this.exerciseState.bestStreak;
  readonly showMilestone = this.exerciseState.showMilestone;
  readonly milestoneValue = this.exerciseState.milestoneValue;
  readonly confettiPieces = this.exerciseState.confettiPieces;
  readonly confettiX = this.exerciseState.confettiX;

  readonly typeCorrectCount = computed(
    () => this.statsService.statsByType()[EXERCISE_TYPE]?.correct ?? 0
  );
  readonly typeIncorrectCount = computed(
    () => this.statsService.statsByType()[EXERCISE_TYPE]?.incorrect ?? 0
  );
  readonly typeTotalCount = computed(
    () => this.typeCorrectCount() + this.typeIncorrectCount()
  );

  readonly answeredCount = signal(0);

  private utterance: SpeechSynthesisUtterance | null = null;

  async ngOnInit(): Promise<void> {
    const userId = this.authService.currentUser()?.id;

    if (!userId) {
      this.sessionEmpty.set(true);
      this.isLoading.set(false);
      return;
    }

    await this.englischService.loadUserData(userId);

    try {
      this.queue = await this.englischService.buildSession(userId);
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

  private showCurrentWord(): void {
    if (this.currentIndex >= this.queue.length) {
      const userId = this.authService.currentUser()?.id;
      if (userId) {
        void Promise.resolve(this.englischService.buildSession(userId)).then((queue) => {
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
    this.userAnswer.set('');
    this.feedback.set(null);
    this.correctAnswer.set('');
    this.keypadDisabled.set(false);
    this.playWord();
  }

  playWord(): void {
    const word = this.currentWord();
    if (!word) return;

    const prompt = word.promptEn ?? word.word;
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(prompt);
    utt.lang = this.englischService.speechLang();
    utt.rate = 0.85;
    this.utterance = utt;
    speechSynthesis.speak(utt);
  }

  submitAnswer(): void {
    const word = this.currentWord();
    if (!word || this.keypadDisabled()) return;

    const answer = this.userAnswer().trim().toLowerCase();
    const expected = (word.answerDe ?? '').trim().toLowerCase();
    const isCorrect = answer === expected && expected.length > 0;

    this.feedback.set(isCorrect ? 'correct' : 'incorrect');
    this.keypadDisabled.set(true);

    if (!isCorrect) {
      this.correctAnswer.set(word.answerDe ?? '');
    }

    this.statsService.recordResult(isCorrect, EXERCISE_TYPE);

    const userId = this.authService.currentUser()?.id;
    if (userId) {
      this.englischService.updateWordWeight(userId, word.wordId, isCorrect);
    }

    if (isCorrect) {
      this.answeredCount.update((n) => n + 1);
    }

    this.exerciseState.handleResult(isCorrect, () => this.showCurrentWord(), 1000, 2000);
  }
}
