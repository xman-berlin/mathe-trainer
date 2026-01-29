import { Component, signal, computed, inject, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClockService, ClockExerciseType, ClockProblem } from '../../services/clock';
import { ClockDisplayComponent } from '../clock-display/clock-display';

@Component({
  standalone: true,
  selector: 'app-clock-exercise',
  imports: [RouterLink, FormsModule, ClockDisplayComponent],
  templateUrl: './clock-exercise.html',
  styleUrl: './clock-exercise.css'
})
export class ClockExerciseComponent {
  private clockService = inject(ClockService);

  // State
  selectedType = signal<ClockExerciseType>('full');
  currentProblem = signal<ClockProblem | null>(null);
  userAnswer = signal('');
  showFeedback = signal(false);
  isCorrect = signal(false);

  // Available exercise types
  readonly exerciseTypes: ClockExerciseType[] = ['full', 'half', 'quarter'];

  // Computed
  readonly timeOfDayLabel = computed(() => {
    const problem = this.currentProblem();
    return problem ? this.clockService.getTimeOfDayLabel(problem.timeOfDay) : '';
  });

  constructor() {
    // Generate initial problem
    this.generateProblem();

    // Auto-focus on input when feedback is hidden
    effect(() => {
      if (!this.showFeedback()) {
        setTimeout(() => {
          const input = document.querySelector('.time-input') as HTMLInputElement;
          input?.focus();
        }, 100);
      }
    });
  }

  generateProblem(): void {
    const problem = this.clockService.generateProblem(this.selectedType());
    this.currentProblem.set(problem);
    this.userAnswer.set('');
    this.showFeedback.set(false);
  }

  selectType(type: ClockExerciseType): void {
    this.selectedType.set(type);
    this.generateProblem();
  }

  getTypeLabel(type: ClockExerciseType): string {
    return this.clockService.getTypeLabel(type);
  }

  submitAnswer(): void {
    const answer = this.userAnswer().trim();
    const problem = this.currentProblem();

    if (!problem || !answer) return;

    // Validate format
    if (!this.clockService.isValidFormat(answer)) {
      alert('Bitte gib die Zeit im Format HH:MM ein (z.B. 09:30 oder 15:45)');
      return;
    }

    // Check if correct
    const correct = this.clockService.isCorrect(answer, problem.correctAnswer);
    this.isCorrect.set(correct);
    this.showFeedback.set(true);

    // Auto-advance after delay
    const delay = correct ? 1000 : 2000;
    setTimeout(() => {
      this.generateProblem();
    }, delay);
  }

  // Handle number pad clicks
  addDigit(digit: string): void {
    const current = this.userAnswer();

    // Auto-format with colon
    if (current.length === 2 && !current.includes(':')) {
      this.userAnswer.set(current + ':' + digit);
    } else if (current.length < 5) {
      this.userAnswer.set(current + digit);
    }
  }

  addColon(): void {
    const current = this.userAnswer();
    if (current.length === 2 && !current.includes(':')) {
      this.userAnswer.set(current + ':');
    }
  }

  backspace(): void {
    const current = this.userAnswer();
    this.userAnswer.set(current.slice(0, -1));
  }

  clear(): void {
    this.userAnswer.set('');
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.showFeedback()) {
      this.submitAnswer();
    } else if (event.key === 'Backspace') {
      this.backspace();
    } else if (event.key === ':') {
      this.addColon();
    } else if (/^\d$/.test(event.key)) {
      this.addDigit(event.key);
      event.preventDefault();
    }
  }
}
