import { Component, ElementRef, ViewChild, signal, AfterViewInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { StatsService } from '../../services/stats.service';

const MAX_DIGITS = 3;

type ExerciseType = 'addition' | 'subtraction';

@Component({
  standalone: true,
  selector: 'app-exercise',
  imports: [],
  templateUrl: './exercise.component.html',
  styleUrls: ['./exercise.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExerciseComponent implements AfterViewInit {
  operandA = signal(0);
  operandB = signal(0);
  userAnswer = signal('');
  feedback = signal<'idle' | 'correct' | 'incorrect'>('idle');
  showCorrectAnswer = signal(false);

  selectedTypes = signal<Set<ExerciseType>>(new Set(['addition', 'subtraction']));
  currentType = signal<ExerciseType>('addition');

  @ViewChild('answerInput', { static: false }) answerInput?: ElementRef<HTMLInputElement>;

  private isInitialized = false;

  constructor(private stats: StatsService) {
    this.generateProblem();
  }

  operatorSymbol = computed(() =>
    this.currentType() === 'addition' ? '+' : '−'
  );

  correctAnswer = computed(() => {
    const a = this.operandA();
    const b = this.operandB();
    return this.currentType() === 'addition' ? a + b : a - b;
  });

  typeCorrectCount = computed(() => {
    const types = this.stats.statsByType();
    let total = 0;
    for (const type of this.selectedTypes()) {
      total += types[type]?.correct ?? 0;
    }
    return total;
  });

  typeIncorrectCount = computed(() => {
    const types = this.stats.statsByType();
    let total = 0;
    for (const type of this.selectedTypes()) {
      total += types[type]?.incorrect ?? 0;
    }
    return total;
  });

  typeTotalCount = computed(() => this.typeCorrectCount() + this.typeIncorrectCount());

  isTypeSelected(type: ExerciseType): boolean {
    return this.selectedTypes().has(type);
  }

  toggleType(type: ExerciseType) {
    const current = this.selectedTypes();
    const newSet = new Set(current);
    if (newSet.has(type)) {
      if (newSet.size > 1) newSet.delete(type);
    } else {
      newSet.add(type);
    }
    this.selectedTypes.set(newSet);
  }

  ngAfterViewInit() {
    this.isInitialized = true;
    setTimeout(() => this.focusInput(), 50);
  }

  generateProblem() {
    const types = Array.from(this.selectedTypes());
    const type = types[Math.floor(Math.random() * types.length)];
    this.currentType.set(type);

    const prevA = this.operandA();
    const prevB = this.operandB();
    let a: number;
    let b: number;

    do {
      // b is always 1-10
      b = this.randomInt(1, 10);

      if (type === 'addition') {
        // Tens crossing: (a % 10) + b > 10
        // So ones digit of a must be >= (11 - b)
        const minOnes = 11 - b;
        const maxOnes = 9;
        const ones = this.randomInt(minOnes, maxOnes);
        // Tens can be 0-9, but a + b <= 100
        const maxTens = Math.floor((100 - b) / 10);
        const tens = this.randomInt(0, maxTens);
        a = tens * 10 + ones;
      } else {
        // Tens crossing: (a % 10) < b, need to borrow
        // So ones digit of a must be 0 to (b - 1)
        const ones = this.randomInt(0, b - 1);
        // a must be >= 10 to have a meaningful subtraction with borrowing
        // and a >= b for non-negative result
        const minTens = 1;
        const maxTens = 10;
        const tens = this.randomInt(minTens, maxTens);
        a = tens * 10 + ones;
      }
    } while (a === prevA && b === prevB);

    this.operandA.set(a);
    this.operandB.set(b);

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
    const current = this.userAnswer();
    if (current.length >= MAX_DIGITS) return;
    const next = (current + digit).replace(/^0+(\d)/, '$1');
    this.userAnswer.set(next);
  }

  deleteDigit() {
    const val = this.userAnswer();
    this.userAnswer.set(val.length > 0 ? val.slice(0, -1) : '');
  }

  handleKeydown(event: KeyboardEvent) {
    const key = event.key;

    if (/^[0-9]$/.test(key)) {
      event.preventDefault();
      this.addDigit(key);
      return;
    }

    if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault();
      this.deleteDigit();
      return;
    }

    if (key === 'Enter') {
      event.preventDefault();
      this.submitAnswer();
      return;
    }
  }

  submitAnswer() {
    const userInputValue = this.userAnswer();
    if (userInputValue === '') return;
    const parsed = Number(userInputValue);
    const isCorrect = Number.isFinite(parsed) && Number.isInteger(parsed) && parsed === this.correctAnswer();

    if (isCorrect) {
      this.feedback.set('correct');
      setTimeout(() => this.generateProblem(), 600);
    } else {
      this.feedback.set('incorrect');
      this.showCorrectAnswer.set(true);
      setTimeout(() => this.generateProblem(), 1200);
    }

    this.stats.recordResult(isCorrect, this.currentType());
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
}
