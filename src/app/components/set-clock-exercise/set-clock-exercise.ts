import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InteractiveClockDisplayComponent } from '../interactive-clock-display/interactive-clock-display';
import { StatsService } from '../../services/stats.service';

export type ClockExerciseType = 'full' | 'half' | 'quarter' | 'fiveMin';
export type TimeDisplayMode = 'digital' | 'german';

export interface SetClockProblem {
  targetTime: string;        // "15:30" or "halb fünf"
  correctHourAngle: number;  // Calculated angle for hour hand
  correctMinuteAngle: number; // Calculated angle for minute hand
  type: ClockExerciseType;
  hours: number;
  minutes: number;
}

@Component({
  standalone: true,
  selector: 'app-set-clock-exercise',
  imports: [RouterLink, FormsModule, InteractiveClockDisplayComponent],
  templateUrl: './set-clock-exercise.html',
  styleUrls: ['./set-clock-exercise.css']
})
export class SetClockExerciseComponent implements OnInit {
  private stats = inject(StatsService);

  // UI Layout
  displayMode = signal<TimeDisplayMode>('digital');
  selectedTypes = signal<Set<ClockExerciseType>>(new Set(['full', 'half', 'quarter', 'fiveMin']));

  // Available exercise types
  readonly exerciseTypes: ClockExerciseType[] = ['full', 'half', 'quarter', 'fiveMin'];

  // Interactive Clock
  userHourAngle = signal(0);
  userMinuteAngle = signal(0);

  // Target & Validation
  currentProblem = signal<SetClockProblem | null>(null);
  isCorrect = signal(false);
  showFeedback = signal(false);

  // Streak tracking
  streak = signal(0);
  bestStreak = signal(0);
  showMilestone = signal(false);
  milestoneValue = signal(0);
  private streakMilestones = [5, 10, 20, 30, 40, 50];

  // Confetti
  confettiPieces = Array.from({ length: 20 }, (_, i) => i);
  confettiX = Array.from({ length: 20 }, () => Math.random() * 100);

  // Problem history - prevent same problem within 10 exercises
  private problemHistory: { hours: number; minutes: number }[] = [];
  private readonly historySize = 10;

  // Computed properties
  readonly typeCorrectCount = computed(() => {
    const types = this.stats.statsByType();
    let total = 0;
    for (const type of this.selectedTypes()) {
      total += types[`clock-setClock-${type}`]?.correct ?? 0;
    }
    return total;
  });

  readonly typeIncorrectCount = computed(() => {
    const types = this.stats.statsByType();
    let total = 0;
    for (const type of this.selectedTypes()) {
      total += types[`clock-setClock-${type}`]?.incorrect ?? 0;
    }
    return total;
  });

  readonly typeTotalCount = computed(() => this.typeCorrectCount() + this.typeIncorrectCount());

  readonly targetTimeDisplay = computed(() => {
    const problem = this.currentProblem();
    return problem ? problem.targetTime : '';
  });

  readonly targetHours = computed(() => {
    const problem = this.currentProblem();
    return problem ? problem.hours : 0;
  });

  readonly targetMinutes = computed(() => {
    const problem = this.currentProblem();
    return problem ? problem.minutes : 0;
  });

   ngOnInit(): void {
     this.generateProblem();
   }

   // Type selector methods
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
    const labels: Record<ClockExerciseType, string> = {
      'full': 'Volle Stunden',
      'half': 'Halbe Stunden',
      'quarter': 'Viertelstunden',
      'fiveMin': '5 Minuten'
    };
    return labels[type];
  }

  getTypeIcon(type: ClockExerciseType): string {
    const icons: Record<ClockExerciseType, string> = {
      'full': '60',
      'half': '30',
      'quarter': '15',
      'fiveMin': '05'
    };
    return icons[type];
  }

  // Display mode methods
  toggleDisplayMode(): void {
    this.displayMode.set(this.displayMode() === 'digital' ? 'german' : 'digital');
    this.generateProblem(); // Regenerate with new display mode
  }

  getDisplayModeLabel(): string {
    return this.displayMode() === 'digital' ? '24h-Format' : 'Deutsche Ausdrücke';
  }

  getDisplayModeIcon(): string {
    return this.displayMode() === 'digital' ? '🕐' : '🗣️';
  }

  // Clock interaction methods
  onUserHourAngleChange(hourAngle: number): void {
    this.userHourAngle.set(hourAngle);
  }

  onUserMinuteAngleChange(minuteAngle: number): void {
    this.userMinuteAngle.set(minuteAngle);
  }

  // Problem generation
  generateProblem(): void {
    // Select random type from selected types
    const selected = Array.from(this.selectedTypes());
    if (selected.length === 0) return;

    const type = selected[Math.floor(Math.random() * selected.length)];

    // Generate time based on type
    let hours: number, minutes: number;

    switch (type) {
      case 'full':
        hours = Math.floor(Math.random() * 12);
        minutes = 0;
        break;
      case 'half':
        hours = Math.floor(Math.random() * 12);
        minutes = 30;
        break;
      case 'quarter':
        hours = Math.floor(Math.random() * 12);
        minutes = Math.random() < 0.5 ? 15 : 45;
        break;
      case 'fiveMin':
        hours = Math.floor(Math.random() * 12);
        minutes = Math.floor(Math.random() * 12) * 5;
        break;
    }

    // Ensure it's not in recent history
    if (this.isProblemInHistory(hours, minutes)) {
      // Try a few times to find a unique problem
      for (let attempts = 0; attempts < 10; attempts++) {
        switch (type) {
          case 'full':
            hours = Math.floor(Math.random() * 12);
            minutes = 0;
            break;
          case 'half':
            hours = Math.floor(Math.random() * 12);
            minutes = 30;
            break;
          case 'quarter':
            hours = Math.floor(Math.random() * 12);
            minutes = Math.random() < 0.5 ? 15 : 45;
            break;
          case 'fiveMin':
            hours = Math.floor(Math.random() * 12);
            minutes = Math.floor(Math.random() * 12) * 5;
            break;
        }
        if (!this.isProblemInHistory(hours, minutes)) break;
      }
    }

    // Add to history
    this.problemHistory.push({ hours, minutes });
    if (this.problemHistory.length > this.historySize) {
      this.problemHistory.shift();
    }

    // Calculate correct angles
    const correctHourAngle = this.calculateHourAngle(hours, minutes);
    const correctMinuteAngle = this.calculateMinuteAngle(minutes);

    // Generate display text
    const targetTime = this.displayMode() === 'digital'
      ? this.formatTime24h(hours, minutes)
      : this.generateGermanExpression(hours, minutes);

    const problem: SetClockProblem = {
      targetTime,
      correctHourAngle,
      correctMinuteAngle,
      type,
      hours,
      minutes
    };

    this.currentProblem.set(problem);
    this.userHourAngle.set(0);
    this.userMinuteAngle.set(0);
    this.showFeedback.set(false);
  }

  private isProblemInHistory(hours: number, minutes: number): boolean {
    return this.problemHistory.some(p => p.hours === hours && p.minutes === minutes);
  }

  private calculateHourAngle(hours: number, minutes: number): number {
    // Hour hand moves 30° per hour + 0.5° per minute
    return (hours * 30) + (minutes * 0.5);
  }

  private calculateMinuteAngle(minutes: number): number {
    // Minute hand moves 6° per minute
    return minutes * 6;
  }

  private formatTime24h(hours: number, minutes: number): string {
    let hours24 = hours;
    if (hours === 0) hours24 = 12; // 0 on analog clock = 12

    // Convert to 24-hour format
    if (hours24 !== 12) {
      hours24 += 12; // Assume afternoon for now
    } else {
      hours24 = 0; // 12 AM = 00:xx
    }

    return `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private generateGermanExpression(hours: number, minutes: number): string {
    const hourNames = [
      'zwölf', 'eins', 'zwei', 'drei', 'vier', 'fünf',
      'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf'
    ];

    const nextHour = (hours + 1) % 12;
    const nextHourName = hourNames[nextHour];
    const currentHourName = hourNames[hours];

    if (minutes === 0) {
      return `${currentHourName} Uhr`;
    } else if (minutes === 15) {
      // Equivalent: "viertel nach [hour]" or "viertel [nextHour]"
      return Math.random() < 0.5 ? `viertel nach ${currentHourName}` : `viertel ${nextHourName}`;
    } else if (minutes === 30) {
      return `halb ${nextHourName}`;
    } else if (minutes === 45) {
      // Equivalent: "viertel vor [nextHour]" or "dreiviertel [nextHour]"
      return Math.random() < 0.5 ? `viertel vor ${nextHourName}` : `dreiviertel ${nextHourName}`;
    } else {
      // 5-minute intervals
      const minuteWords = [
        '', 'fünf', 'zehn', 'viertel', 'zwanzig', 'fünf',
        'halb', 'fünf', 'zwanzig', 'viertel', 'zehn', 'fünf'
      ];
      const minuteWord = minuteWords[minutes / 5];

      if (minutes < 30) {
        return `${minuteWord} nach ${currentHourName}`;
      } else {
        return `${minuteWord} vor ${nextHourName}`;
      }
    }
  }

  // Validation and submission
  submitAnswer(): void {
    if (!this.currentProblem() || this.showFeedback()) return;

    const problem = this.currentProblem()!;
    const userHour = this.userHourAngle();
    const userMinute = this.userMinuteAngle();

    // Check if angles are close enough (within 5 degrees tolerance)
    const hourDiff = Math.abs(this.normalizeAngle(userHour - problem.correctHourAngle));
    const minuteDiff = Math.abs(this.normalizeAngle(userMinute - problem.correctMinuteAngle));

    const isHourCorrect = hourDiff <= 5 || hourDiff >= 355; // Handle angle wraparound
    const isMinuteCorrect = minuteDiff <= 5 || minuteDiff >= 355;

    const correct = isHourCorrect && isMinuteCorrect;
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

    // Record stats
    const exerciseType = `clock-setClock-${problem.type}`;
    this.stats.recordResult(correct, exerciseType);

    // Auto-advance after delay
    const delay = correct ? 1500 : 2500;
    setTimeout(() => {
      this.generateProblem();
    }, delay);
  }

  private normalizeAngle(angle: number): number {
    // Normalize angle to 0-360 range
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  }
}