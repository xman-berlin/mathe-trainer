import { Component, ElementRef, ViewChild, signal, AfterViewInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatsService } from '../../services/stats.service';

interface HistoryEntry {
  operandA: number;
  operandB: number;
  correctAnswer: number;
  userAnswer: number | null;
  isCorrect: boolean;
  timestamp: number;
}

@Component({
  standalone: true,
  selector: 'app-addition',
  imports: [CommonModule, FormsModule],
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
  history = signal<HistoryEntry[]>([]);

  @ViewChild('answerInput', { static: false }) answerInput?: ElementRef<HTMLInputElement>;

  private isInitialized = false;

  constructor(private stats: StatsService) {
    this.generateProblem();
  }

  ngAfterViewInit() {
    this.isInitialized = true;
    setTimeout(() => this.focusInput(), 50);
  }

  get correctAnswer(): number {
    return this.operandA() + this.operandB();
  }

  get correctCount(): number {
    return this.stats.correctCount();
  }

  get incorrectCount(): number {
    return this.stats.incorrectCount();
  }

  get totalCount(): number {
    return this.stats.totalCount();
  }

  generateProblem() {
    const a = this.randomInt(0, 100);
    const b = this.randomInt(0, 100 - a);
    // avoid repeating the exact same pair
    if (a === this.operandA() && b === this.operandB()) {
      const b2 = this.randomInt(0, 100 - a);
      this.operandA.set(a);
      this.operandB.set(b2);
    } else {
      this.operandA.set(a);
      this.operandB.set(b);
    }

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
    const userInputValue = this.userAnswer();
    const parsed = Number(userInputValue);
    const isCorrect = Number.isFinite(parsed) && Number.isInteger(parsed) && parsed === this.correctAnswer;

    // Add to history
    const historyEntry: HistoryEntry = {
      operandA: this.operandA(),
      operandB: this.operandB(),
      correctAnswer: this.correctAnswer,
      userAnswer: Number.isFinite(parsed) && Number.isInteger(parsed) ? parsed : null,
      isCorrect: isCorrect,
      timestamp: Date.now()
    };

    const currentHistory = this.history();
    this.history.set([historyEntry, ...currentHistory]);

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

  next() {
    // This method is no longer needed but kept for backward compatibility
    this.generateProblem();
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
