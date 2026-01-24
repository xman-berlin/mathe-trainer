import { Component, ElementRef, ViewChild, signal, AfterViewInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { StatsService } from '../../services/stats.service';

const MAX_DIGITS = 3;

@Component({
  standalone: true,
  selector: 'app-addition',
  imports: [],
  templateUrl: './addition.component.html',
  styleUrls: ['./addition.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdditionComponent implements AfterViewInit {
  operandA = signal(0);
  operandB = signal(0);
  userAnswer = signal('');
  feedback = signal<'idle' | 'correct' | 'incorrect'>('idle');
  showCorrectAnswer = signal(false);

  @ViewChild('answerInput', { static: false }) answerInput?: ElementRef<HTMLInputElement>;

  private isInitialized = false;

  constructor(private stats: StatsService) {
    this.generateProblem();
  }

  correctAnswer = computed(() => this.operandA() + this.operandB());
  typeCorrectCount = computed(() => this.stats.statsByType()['addition']?.correct ?? 0);
  typeIncorrectCount = computed(() => this.stats.statsByType()['addition']?.incorrect ?? 0);
  typeTotalCount = computed(() => this.typeCorrectCount() + this.typeIncorrectCount());

  ngAfterViewInit() {
    this.isInitialized = true;
    setTimeout(() => this.focusInput(), 50);
  }

  generateProblem() {
    const prevA = this.operandA();
    const prevB = this.operandB();
    let a: number;
    let b: number;

    // Generate new problem, avoiding exact repeat
    do {
      a = this.randomInt(0, 100);
      b = this.randomInt(0, 100 - a);
    } while (a === prevA && b === prevB);

    this.operandA.set(a);
    this.operandB.set(b);

    this.userAnswer.set('');
    this.feedback.set('idle');
    this.showCorrectAnswer.set(false);

    // focus input on next tick with longer delay to ensure DOM is updated
    if (this.isInitialized) {
      setTimeout(() => this.focusInput(), 150);
    }
  }

  randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  addDigit(digit: string) {
    const current = this.userAnswer();
    if (current.length >= MAX_DIGITS) return; // Enforce max length
    const next = (current + digit).replace(/^0+(\d)/, '$1');
    this.userAnswer.set(next);
  }

  deleteDigit() {
    const val = this.userAnswer();
    this.userAnswer.set(val.length > 0 ? val.slice(0, -1) : '');
  }

  handleKeydown(event: KeyboardEvent) {
    const key = event.key;

    // Handle digit keys (0-9)
    if (/^[0-9]$/.test(key)) {
      event.preventDefault();
      this.addDigit(key);
      return;
    }

    // Handle backspace/delete
    if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault();
      this.deleteDigit();
      return;
    }

    // Handle enter
    if (key === 'Enter') {
      event.preventDefault();
      this.submitAnswer();
      return;
    }
  }

  submitAnswer() {
    const userInputValue = this.userAnswer();
    if (userInputValue === '') return; // Prevent empty submission
    const parsed = Number(userInputValue);
    const isCorrect = Number.isFinite(parsed) && Number.isInteger(parsed) && parsed === this.correctAnswer();

    // Always generate next problem after brief feedback
    if (isCorrect) {
      this.feedback.set('correct');
      setTimeout(() => this.generateProblem(), 600);
    } else {
      this.feedback.set('incorrect');
      this.showCorrectAnswer.set(true);
      setTimeout(() => this.generateProblem(), 1200);
    }

    this.stats.recordResult(isCorrect, 'addition');
  }

  focusInput() {
    if (!this.answerInput) return;
    try {
      const inputElement = this.answerInput.nativeElement;
      inputElement.focus();
      inputElement.select();
    } catch (e) {
      console.error('Focus error:', e);
    }
  }
}
