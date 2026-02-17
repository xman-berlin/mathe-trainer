import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WordProblem, WordProblemType, NumberRange } from '../../models/word-problem.model';
import { WordProblemService } from '../../services/word-problem.service';
import { StatsService } from '../../services/stats.service';
import { AchievementsService } from '../../services/achievements.service';
import { KeypadComponent } from '../shared/keypad/keypad.component';
import { StatsBadgeComponent } from '../shared/stats-badge/stats-badge.component';

@Component({
  standalone: true,
  selector: 'app-word-problem-exercise',
  imports: [RouterLink, KeypadComponent, StatsBadgeComponent],
  templateUrl: './word-problem-exercise.component.html',
  styleUrls: ['./word-problem-exercise.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WordProblemExerciseComponent implements OnInit {
  currentProblem = signal<WordProblem | null>(null);
  userAnswer = signal('');
  feedback = signal<'idle' | 'correct' | 'incorrect'>('idle');
  showCorrectAnswer = signal(false);

  // Streak tracking
  streak = signal(0);
  showMilestone = signal(false);
  milestoneValue = signal(0);
  private streakMilestones = [5, 10, 20, 30, 40, 50, 75, 100];

  // Best streak loaded from StatsService
  bestStreak = computed(() => this.stats.getBestStreak('word-problems'));

  // Confetti
  confettiPieces = Array.from({ length: 20 }, (_, i) => i);
  confettiX = Array.from({ length: 20 }, () => Math.random() * 100);

  selectedTypes = signal<Set<WordProblemType>>(new Set(['addition', 'subtraction', 'multiplication', 'division']));
  currentType = signal<WordProblemType>('addition');
  numberRange = signal<NumberRange>('bis20');

  private wordProblemService = inject(WordProblemService);
  private stats = inject(StatsService);
  private achievements = inject(AchievementsService);

  constructor() {
    this.generateProblem();
  }

  ngOnInit(): void {
    // Load number range preference from localStorage
    const savedRange = localStorage.getItem('wordProblemRange') as NumberRange | null;
    if (savedRange === 'bis20' || savedRange === 'bis100') {
      this.numberRange.set(savedRange);
    }

    // Clean up old localStorage item (migration)
    localStorage.removeItem('wordProblemCurrentStreak');

    // Current streak always starts at 0 when entering the exercise
    // Only the best streak is loaded from StatsService (persistent)
  }

  storyText = computed(() => this.currentProblem()?.storyText ?? '');

  storyIcon = computed(() => {
    const problem = this.currentProblem();
    if (!problem) return '📝';
    return this.wordProblemService.getTemplateIcon(problem.templateId);
  });

  correctAnswer = computed(() => this.currentProblem()?.correctAnswer ?? 0);

  keypadDisabled = computed(() => this.feedback() !== 'idle');

  wordProblemCorrectCount = computed(() => {
    const types = this.stats.statsByType();
    return types['word-problems']?.correct ?? 0;
  });

  wordProblemIncorrectCount = computed(() => {
    const types = this.stats.statsByType();
    return types['word-problems']?.incorrect ?? 0;
  });

  operatorSymbol(type: WordProblemType): string {
    switch (type) {
      case 'addition': return '+';
      case 'subtraction': return '−';
      case 'multiplication': return '×';
      case 'division': return '÷';
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

  setNumberRange(range: NumberRange) {
    this.numberRange.set(range);
    localStorage.setItem('wordProblemRange', range);
    this.generateProblem();
  }


  generateProblem() {
    const types = Array.from(this.selectedTypes());
    const type = types[Math.floor(Math.random() * types.length)];

    const problem = this.wordProblemService.generateProblem(type, this.numberRange());
    this.currentProblem.set(problem);
    this.currentType.set(type);

    this.userAnswer.set('');
    this.feedback.set('idle');
    this.showCorrectAnswer.set(false);
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

      // Update best streak in StatsService (will sync to server immediately)
      this.stats.updateBestStreak('word-problems', newStreak);

      // Check for milestone
      if (this.streakMilestones.includes(newStreak)) {
        this.milestoneValue.set(newStreak);
        this.confettiX = Array.from({ length: 20 }, () => Math.random() * 100);
        this.showMilestone.set(true);
        setTimeout(() => this.showMilestone.set(false), 2000);
      }

      setTimeout(() => this.generateProblem(), 600);
    } else {
      this.feedback.set('incorrect');
      this.showCorrectAnswer.set(true);
      this.streak.set(0); // Reset streak on wrong answer
      setTimeout(() => this.generateProblem(), 1200);
    }

    this.stats.recordResult(isCorrect, 'word-problems');
  }
}
