import { Component, signal, computed, inject, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClockService, ClockExerciseType, ClockProblem } from '../../services/clock';
import { ClockDisplayComponent } from '../clock-display/clock-display';
import { StatsService } from '../../services/stats.service';

@Component({
  standalone: true,
  selector: 'app-clock-exercise',
  imports: [RouterLink, FormsModule, ClockDisplayComponent],
  templateUrl: './clock-exercise.html',
  styleUrl: './clock-exercise.css'
})
export class ClockExerciseComponent {
  private clockService = inject(ClockService);
  private stats = inject(StatsService);

  // State
  selectedTypes = signal<Set<ClockExerciseType>>(new Set(['full', 'half', 'quarter', 'fiveMin']));
  currentType = signal<ClockExerciseType>('full');
  currentProblem = signal<ClockProblem | null>(null);
  userAnswer = signal('');
  showFeedback = signal(false);
  isCorrect = signal(false);

  // Streak tracking
  streak = signal(0);
  bestStreak = signal(0);
  showMilestone = signal(false);
  milestoneValue = signal(0);
  private streakMilestones = [5, 10, 20, 30, 40, 50];

  // Confetti
  confettiPieces = Array.from({ length: 20 }, (_, i) => i);
  confettiX = Array.from({ length: 20 }, () => Math.random() * 100);

  // Available exercise types
  readonly exerciseTypes: ClockExerciseType[] = ['full', 'half', 'quarter', 'fiveMin'];

  // Computed
  readonly timeOfDayLabel = computed(() => {
    const problem = this.currentProblem();
    return problem ? this.clockService.getTimeOfDayLabel(problem.timeOfDay) : '';
  });

  readonly typeCorrectCount = computed(() => {
    const types = this.stats.statsByType();
    let total = 0;
    for (const type of this.selectedTypes()) {
      total += types[`clock-${type}`]?.correct ?? 0;
    }
    return total;
  });

  readonly typeIncorrectCount = computed(() => {
    const types = this.stats.statsByType();
    let total = 0;
    for (const type of this.selectedTypes()) {
      total += types[`clock-${type}`]?.incorrect ?? 0;
    }
    return total;
  });

  readonly typeTotalCount = computed(() => this.typeCorrectCount() + this.typeIncorrectCount());

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
    // Select random type from selected types
    const selected = Array.from(this.selectedTypes());
    if (selected.length === 0) return;

    const type = selected[Math.floor(Math.random() * selected.length)];
    this.currentType.set(type);

    const problem = this.clockService.generateProblem(type);
    this.currentProblem.set(problem);
    this.userAnswer.set('');
    this.showFeedback.set(false);
  }

  toggleType(type: ClockExerciseType): void {
    const current = new Set(this.selectedTypes());
    if (current.has(type)) {
      // Don't allow deselecting if it's the only one selected
      if (current.size > 1) {
        current.delete(type);
      }
    } else {
      current.add(type);
    }
    this.selectedTypes.set(current);
    this.generateProblem();
  }

  isTypeSelected(type: ClockExerciseType): boolean {
    return this.selectedTypes().has(type);
  }

  getTypeLabel(type: ClockExerciseType): string {
    return this.clockService.getTypeLabel(type);
  }

  getTypeIcon(type: ClockExerciseType): string {
    return this.clockService.getTypeIcon(type);
  }

  submitAnswer(): void {
    const answer = this.userAnswer().trim();
    const problem = this.currentProblem();

    if (!problem || !answer) return;
    if (this.showFeedback()) return; // Prevent multiple submissions

    // Validate format
    if (!this.clockService.isValidFormat(answer)) {
      alert('Bitte gib die Zeit mit führender Null ein (z.B. 09:00 oder 15:30)');
      return;
    }

    // Check if correct
    const correct = this.clockService.isCorrect(answer, problem.correctAnswer);
    this.isCorrect.set(correct);
    this.showFeedback.set(true);

    // Update streak
    if (correct) {
      const newStreak = this.streak() + 1;
      this.streak.set(newStreak);

      // Update best streak
      if (newStreak > this.bestStreak()) {
        this.bestStreak.set(newStreak);
      }

      // Check for milestone
      if (this.streakMilestones.includes(newStreak)) {
        this.milestoneValue.set(newStreak);
        this.confettiX = Array.from({ length: 20 }, () => Math.random() * 100);
        this.showMilestone.set(true);
        setTimeout(() => this.showMilestone.set(false), 2000);
      }
    } else {
      this.streak.set(0); // Reset streak on wrong answer
    }

    // Record stats with type prefix "clock-"
    const exerciseType = `clock-${this.currentType()}`;
    this.stats.recordResult(correct, exerciseType);

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

  backspace(): void {
    const current = this.userAnswer();
    this.userAnswer.set(current.slice(0, -1));
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.showFeedback()) {
      this.submitAnswer();
    } else if (event.key === 'Backspace') {
      this.backspace();
    } else if (/^\d$/.test(event.key)) {
      this.addDigit(event.key);
      event.preventDefault();
    }
  }
}
