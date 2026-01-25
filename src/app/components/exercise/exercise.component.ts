import { Component, ElementRef, ViewChild, signal, AfterViewInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { StatsService } from '../../services/stats.service';

const MAX_DIGITS = 3;

type ExerciseType = 'addition' | 'subtraction' | 'multiplication' | 'division';

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

  // Streak tracking
  streak = signal(0);
  bestStreak = signal(0);
  showMilestone = signal(false);
  milestoneValue = signal(0);
  private streakMilestones = [5, 10, 25, 50, 100];

  selectedTypes = signal<Set<ExerciseType>>(new Set(['addition', 'subtraction', 'multiplication', 'division']));
  currentType = signal<ExerciseType>('addition');

  // Selected numbers for multiplication and division (empty = all, otherwise specific ones)
  selectedNumbers = signal<Set<number>>(new Set());
  numberOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  @ViewChild('answerInput', { static: false }) answerInput?: ElementRef<HTMLInputElement>;

  private isInitialized = false;

  constructor(private stats: StatsService) {
    this.generateProblem();
  }

  operatorSymbol = computed(() => {
    switch (this.currentType()) {
      case 'addition': return '+';
      case 'subtraction': return '−';
      case 'multiplication': return '×';
      case 'division': return '÷';
    }
  });

  correctAnswer = computed(() => {
    const a = this.operandA();
    const b = this.operandB();
    switch (this.currentType()) {
      case 'addition': return a + b;
      case 'subtraction': return a - b;
      case 'multiplication': return a * b;
      case 'division': return a / b;
    }
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

  toggleNumber(value: number) {
    const current = this.selectedNumbers();
    const newSet = new Set(current);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    this.selectedNumbers.set(newSet);
    // Generate new problem if multiplication or division is active
    if (this.currentType() === 'multiplication' || this.currentType() === 'division') {
      this.generateProblem();
    }
  }

  isNumberSelected(value: number): boolean {
    return this.selectedNumbers().has(value);
  }

  allNumbersSelected(): boolean {
    return this.selectedNumbers().size === 0;
  }

  selectAllNumbers() {
    this.selectedNumbers.set(new Set());
    if (this.currentType() === 'multiplication' || this.currentType() === 'division') {
      this.generateProblem();
    }
  }

  toggleType(type: ExerciseType) {
    const current = this.selectedTypes();
    const newSet = new Set(current);
    if (newSet.has(type)) {
      if (newSet.size > 1) {
        newSet.delete(type);
        this.selectedTypes.set(newSet);
        // Generate new problem if current type was deselected
        if (this.currentType() === type) {
          this.generateProblem();
        }
      }
    } else {
      newSet.add(type);
      this.selectedTypes.set(newSet);
    }
  }

  ngAfterViewInit() {
    this.isInitialized = true;
    setTimeout(() => this.focusInput(), 50);
  }

  generateProblem() {
    const types = Array.from(this.selectedTypes());
    const prevType = this.currentType();
    const prevA = this.operandA();
    const prevB = this.operandB();

    let type: ExerciseType;
    let a: number;
    let b: number;

    do {
      type = types[Math.floor(Math.random() * types.length)];

      if (type === 'addition') {
        // b is 1-10, tens crossing: (a % 10) + b > 10
        b = this.randomInt(1, 10);
        const minOnes = 11 - b;
        const maxOnes = 9;
        const ones = this.randomInt(minOnes, maxOnes);
        const maxTens = Math.floor((100 - b) / 10);
        const tens = this.randomInt(0, maxTens);
        a = tens * 10 + ones;
      } else if (type === 'subtraction') {
        // b is 1-10, tens crossing: (a % 10) < b, need to borrow
        b = this.randomInt(1, 10);
        const ones = this.randomInt(0, b - 1);
        const minTens = 1;
        const maxTens = 10;
        const tens = this.randomInt(minTens, maxTens);
        a = tens * 10 + ones;
      } else if (type === 'multiplication') {
        // Small multiplication table: 1-10 x 1-10
        const selected = this.selectedNumbers();
        if (selected.size > 0) {
          const numbers = Array.from(selected);
          a = this.randomInt(1, 10);
          b = numbers[Math.floor(Math.random() * numbers.length)];
        } else {
          a = this.randomInt(1, 10);
          b = this.randomInt(1, 10);
        }
      } else {
        // Division: b divides a evenly, both factors 1-10
        const selected = this.selectedNumbers();
        if (selected.size > 0) {
          const numbers = Array.from(selected);
          b = numbers[Math.floor(Math.random() * numbers.length)];
        } else {
          b = this.randomInt(1, 10);
        }
        const quotient = this.randomInt(1, 10);
        a = b * quotient;
      }
    } while (type === prevType && a === prevA && b === prevB);

    this.currentType.set(type);
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
    // Prevent multiple submissions while showing feedback
    if (this.feedback() !== 'idle') return;

    const parsed = Number(userInputValue);
    const isCorrect = Number.isFinite(parsed) && Number.isInteger(parsed) && parsed === this.correctAnswer();

    if (isCorrect) {
      this.feedback.set('correct');
      const newStreak = this.streak() + 1;
      this.streak.set(newStreak);

      // Update best streak
      if (newStreak > this.bestStreak()) {
        this.bestStreak.set(newStreak);
      }

      // Check for milestone
      if (this.streakMilestones.includes(newStreak)) {
        this.milestoneValue.set(newStreak);
        this.showMilestone.set(true);
        setTimeout(() => this.showMilestone.set(false), 1500);
      }

      setTimeout(() => this.generateProblem(), 600);
    } else {
      this.feedback.set('incorrect');
      this.showCorrectAnswer.set(true);
      this.streak.set(0); // Reset streak on wrong answer
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
