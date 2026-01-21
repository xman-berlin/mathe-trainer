import { Component, ElementRef, ViewChild, signal, AfterViewInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatsService } from '../../services/stats.service';

@Component({
  standalone: true,
  selector: 'app-subtraction',
  imports: [CommonModule, FormsModule],
  templateUrl: './subtraction.component.html',
  styleUrls: ['../addition/addition.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubtractionComponent implements AfterViewInit {
  operandA = signal(0);
  operandB = signal(0);
  userAnswer = signal('');
  feedback = signal<'idle' | 'correct' | 'incorrect'>('idle');
  showCorrectAnswer = signal(false);

  @ViewChild('answerInput', { static: false }) answerInput?: ElementRef<HTMLInputElement>;
  private isInitialized = false;

  constructor(public stats: StatsService) {
    this.generateProblem();
  }

  typeCorrectCount = computed(() => this.stats.statsByType()['subtraction']?.correct ?? 0);
  typeIncorrectCount = computed(() => this.stats.statsByType()['subtraction']?.incorrect ?? 0);
  typeTotalCount = computed(() => this.typeCorrectCount() + this.typeIncorrectCount());

  ngAfterViewInit() {
    this.isInitialized = true;
    setTimeout(() => this.focusInput(), 50);
  }

  get correctAnswer(): number {
    return this.operandA() - this.operandB();
  }

  generateProblem() {
    // Ensure A - B is between 0 and 100 and A <= 100
    const a = this.randomInt(0, 100);
    const bMax = Math.min(a, 100); // b cannot exceed a to keep result >= 0
    const b = this.randomInt(0, bMax);
    this.operandA.set(a);
    this.operandB.set(b);

    // If result exceeds 100 (it can't with above), but keep defensive check
    const res = a - b;
    if (res < 0 || res > 100) {
      // regenerate conservatively
      this.operandA.set(100);
      this.operandB.set(this.randomInt(0, 100));
    }

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

  addDigit(digit: string) {
    const next = (this.userAnswer() + digit).replace(/^0+(\d)/, '$1');
    this.userAnswer.set(next);
  }

  deleteDigit() {
    const val = this.userAnswer();
    this.userAnswer.set(val.length > 0 ? val.slice(0, -1) : '');
  }

  submitFromKeypad() {
    this.submitAnswer();
  }

  submitAnswer() {
    const parsed = Number(this.userAnswer());
    const isCorrect = Number.isFinite(parsed) && Number.isInteger(parsed) && parsed === this.correctAnswer;

    this.feedback.set(isCorrect ? 'correct' : 'incorrect');
    if (!isCorrect) {
      this.showCorrectAnswer.set(true);
    }

    // Record stats under subtraction type
    this.stats.recordResult(isCorrect, 'subtraction');

    // Generate next problem after brief feedback
    setTimeout(() => this.generateProblem(), isCorrect ? 600 : 1200);
  }

  focusInput() {
    if (!this.answerInput) return;
    try {
      const inputElement = this.answerInput.nativeElement;
      inputElement.focus();
      inputElement.select();
    } catch {}
  }
}
