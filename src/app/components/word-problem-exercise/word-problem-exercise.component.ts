import { Component, signal, computed, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  WordProblem,
  WordProblemType,
  isTwoStepProblem,
} from '../../models/word-problem.model';
import { WordProblemService } from '../../services/word-problem.service';
import { StatsService } from '../../services/stats.service';
import { ExerciseStateService } from '../../services/exercise-state.service';
import { KeypadComponent } from '../shared/keypad/keypad.component';

@Component({
  standalone: true,
  selector: 'app-word-problem-exercise',
  imports: [RouterLink, KeypadComponent],
  templateUrl: './word-problem-exercise.component.html',
  styleUrl: './word-problem-exercise.component.scss',
  providers: [ExerciseStateService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WordProblemExerciseComponent implements OnInit, OnDestroy {
  readonly exerciseTypes: WordProblemType[] = [
    'two-step',
    'addition',
    'subtraction',
    'multiplication',
    'division',
  ];

  currentProblem = signal<WordProblem | null>(null);
  userAnswer = signal('');
  feedback = signal<'idle' | 'correct' | 'incorrect'>('idle');
  showCorrectAnswer = signal(false);

  private wordProblemService = inject(WordProblemService);
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

  selectedTypes = signal<Set<WordProblemType>>(
    new Set(['two-step', 'addition', 'subtraction', 'multiplication', 'division'])
  );
  currentType = signal<WordProblemType>('two-step');

  constructor() {
    this.exerciseState.setMilestones([5, 10, 20, 30, 40, 50, 75, 100]);
    this.generateProblem();
  }

  ngOnInit(): void {
    localStorage.removeItem('wordProblemCurrentStreak');
    localStorage.removeItem('wordProblemRange');
    this.exerciseState.bestStreak.set(this.stats.getBestStreak('word-problems'));
  }

  ngOnDestroy(): void {
    this.exerciseState.reset();
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
    return types['word-problems']?.correct ?? 0;
  });

  wordProblemIncorrectCount = computed(() => {
    const types = this.stats.statsByType();
    return types['word-problems']?.incorrect ?? 0;
  });

  wordProblemTotalCount = computed(
    () => this.wordProblemCorrectCount() + this.wordProblemIncorrectCount()
  );

  operatorSymbol(type: WordProblemType): string {
    switch (type) {
      case 'two-step': return '2+';
      case 'addition': return '+';
      case 'subtraction': return '−';
      case 'multiplication': return '×';
      case 'division': return '÷';
    }
  }

  typeLabel(type: WordProblemType): string {
    switch (type) {
      case 'two-step': return 'Zweistufig';
      case 'addition': return 'Plus';
      case 'subtraction': return 'Minus';
      case 'multiplication': return 'Mal';
      case 'division': return 'Geteilt';
    }
  }

  isTypeSelected(type: WordProblemType): boolean {
    return this.selectedTypes().has(type);
  }

  toggleType(type: WordProblemType) {
    const current = this.selectedTypes();
    const newSet = new Set(current);

    if (newSet.has(type)) {
      if (newSet.size > 1) {
        newSet.delete(type);
        this.selectedTypes.set(newSet);
        if (this.currentType() === type) {
          this.generateProblem();
        }
      }
    } else {
      newSet.add(type);
      this.selectedTypes.set(newSet);
    }
  }

  generateProblem() {
    const types = Array.from(this.selectedTypes());
    const type = types[Math.floor(Math.random() * types.length)];
    const maxValue = this.stats.currentMathNumberRange();
    const problem = this.wordProblemService.generateProblem(type, 'bis100', maxValue);
    this.currentProblem.set(problem);
    this.currentType.set(type);

    this.userAnswer.set('');
    this.feedback.set('idle');
    this.showCorrectAnswer.set(false);
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

    this.exerciseState.handleResult(isCorrect, () => this.generateProblem(), 800, 1200);
    this.stats.recordResult(isCorrect, 'word-problems');

    if (isCorrect) {
      this.stats.updateBestStreak('word-problems', this.exerciseState.streak());
    }
  }
}
