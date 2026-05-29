import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InteractiveClockDisplayComponent } from '../interactive-clock-display/interactive-clock-display';
import { StatsService } from '../../services/stats.service';
import { ExerciseStateService } from '../../services/exercise-state.service';
import { createStatsAggregator } from '../../utils/stats-aggregator';

export type ClockExerciseType = 'full' | 'half' | 'quarter' | 'fiveMin' | 'fiveMinAfter' | 'fiveMinBefore' | 'fiveMinHalf';
export type TimeDisplayMode = 'digital' | 'german';

export interface SetClockProblem {
  targetTime: string;        // "15:30" or "halb fünf"
  correctHourAngle: number;  // Calculated angle for hour hand
  correctMinuteAngle: number; // Calculated angle for minute hand
  type: ClockExerciseType;
  hours: number;
  minutes: number;
  timeOfDay: 'morning' | 'afternoon'; // For time indicator display
}

@Component({
  standalone: true,
  selector: 'app-set-clock-exercise',
  imports: [RouterLink, FormsModule, InteractiveClockDisplayComponent],
  templateUrl: './set-clock-exercise.html',
  styleUrls: ['./set-clock-exercise.scss'],
  providers: [ExerciseStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetClockExerciseComponent implements OnInit {
  private stats = inject(StatsService);
  private exerciseState = inject(ExerciseStateService);

  // Streak tracking (delegated to ExerciseStateService)
  readonly streak = this.exerciseState.streak;
  readonly bestStreak = this.exerciseState.bestStreak;
  readonly showMilestone = this.exerciseState.showMilestone;
  readonly milestoneValue = this.exerciseState.milestoneValue;
  readonly confettiPieces = this.exerciseState.confettiPieces;
  get confettiX() { return this.exerciseState.confettiX; }

  private readonly STORAGE_KEY = 'schlaufuchs-setClock-selectedTypes';
  private readonly ALL_TYPES: ClockExerciseType[] = ['full', 'half', 'quarter', 'fiveMin', 'fiveMinAfter', 'fiveMinBefore', 'fiveMinHalf'];

  // UI Layout
  displayMode = signal<TimeDisplayMode>('digital');
  selectedTypes = signal<Set<ClockExerciseType>>(this.loadSelectedTypes());

  // Available exercise types
  readonly exerciseTypes: ClockExerciseType[] = ['full', 'half', 'quarter', 'fiveMin', 'fiveMinAfter', 'fiveMinBefore', 'fiveMinHalf'];

  // Interactive Clock
  userHourAngle = signal(0);
  userMinuteAngle = signal(0);

  // Target & Validation
  currentProblem = signal<SetClockProblem | null>(null);
  isCorrect = signal(false);
  showFeedback = signal(false);

  // Problem history - prevent same problem within 10 exercises
  private problemHistory: { hours: number; minutes: number }[] = [];
  private readonly historySize = 10;

  // Computed properties
  private statsAgg = createStatsAggregator(this.stats, this.selectedTypes, 'clock-setClock-');
  readonly typeCorrectCount = this.statsAgg.correct;
  readonly typeIncorrectCount = this.statsAgg.incorrect;
  readonly typeTotalCount = this.statsAgg.total;

  /** New exercise types that require the hour hand to be locked (auto-positioned). */
  private readonly newTypes = new Set<ClockExerciseType>(['fiveMinAfter', 'fiveMinBefore', 'fiveMinHalf']);

  /** True when the current problem's hour hand should be auto-set and non-draggable. */
  readonly lockHourHand = computed(() => {
    const problem = this.currentProblem();
    return problem ? this.newTypes.has(problem.type) : false;
  });

  readonly targetTimeDisplay = computed(() => {
    const problem = this.currentProblem();
    return problem ? problem.targetTime : '';
  });

  /** True when the current problem's target time is displayed as a German expression (not digital HH:MM). */
  readonly isGermanDisplay = computed(() => {
    const time = this.targetTimeDisplay();
    return time.length > 0 && !/^\d{1,2}:\d{2}$/.test(time);
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
      // Don't allow deselecting if it's the only one selected or if locked
      if (current.size > 1 && !this.isTypeLocked(type)) {
        current.delete(type);
      }
    } else {
      current.add(type);
    }
    this.selectedTypes.set(current);
    this.saveSelectedTypes(current);
    this.generateProblem();
  }

  isTypeSelected(type: ClockExerciseType): boolean {
    return this.selectedTypes().has(type);
  }

  readonly lockedTypes = computed(() => {
    const lifetime = this.stats.lifetimeStatsByType();
    const allTypes: ClockExerciseType[] = ['full', 'half', 'quarter', 'fiveMin', 'fiveMinAfter', 'fiveMinBefore', 'fiveMinHalf'];
    // New types are additionally hidden until fiveMin is mastered
    const fiveMinMastered = (lifetime[`clock-setClock-fiveMin`] ?? 0) >= 100;
    return new Set<ClockExerciseType>(
      allTypes.filter(t => {
        if (this.newTypes.has(t)) return fiveMinMastered && (lifetime[`clock-setClock-${t}`] ?? 0) >= 100;
        return (lifetime[`clock-setClock-${t}`] ?? 0) >= 100;
      })
    );
  });

  /** True when all exercise types are mastered — format selection is hidden and chosen randomly per problem. */
  readonly autoFormatMode = computed(() => this.exerciseTypes.every(t => this.lockedTypes().has(t)));
  isTypeLocked(type: ClockExerciseType): boolean {
    return this.lockedTypes().has(type);
  }

  getTypeLabel(type: ClockExerciseType): string {
    const labels: Record<ClockExerciseType, string> = {
      'full': 'Volle Stunden',
      'half': 'Halbe Stunden',
      'quarter': 'Viertelstunden',
      'fiveMin': '5 Minuten',
      'fiveMinAfter': 'Minuten nach',
      'fiveMinBefore': 'Minuten vor',
      'fiveMinHalf': 'Vor/Nach halb'
    };
    return labels[type];
  }

  getTypeIcon(type: ClockExerciseType): string {
    const icons: Record<ClockExerciseType, string> = {
      'full': '60',
      'half': '30',
      'quarter': '15',
      'fiveMin': '05',
      'fiveMinAfter': '→',
      'fiveMinBefore': '←',
      'fiveMinHalf': '½'
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
      case 'fiveMinAfter':
        hours = Math.floor(Math.random() * 12);
        minutes = (Math.floor(Math.random() * 5) + 1) * 5; // 5, 10, 15, 20, 25
        break;
      case 'fiveMinBefore':
        hours = Math.floor(Math.random() * 12);
        minutes = 60 - (Math.floor(Math.random() * 5) + 1) * 5; // 35, 40, 45, 50, 55
        break;
      case 'fiveMinHalf':
        hours = Math.floor(Math.random() * 12);
        minutes = [20, 25, 35, 40][Math.floor(Math.random() * 4)];
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
          case 'fiveMinAfter':
            hours = Math.floor(Math.random() * 12);
            minutes = (Math.floor(Math.random() * 5) + 1) * 5;
            break;
          case 'fiveMinBefore':
            hours = Math.floor(Math.random() * 12);
            minutes = 60 - (Math.floor(Math.random() * 5) + 1) * 5;
            break;
          case 'fiveMinHalf':
            hours = Math.floor(Math.random() * 12);
            minutes = [20, 25, 35, 40][Math.floor(Math.random() * 4)];
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

    // Randomly choose morning or afternoon
    const timeOfDay = Math.random() < 0.5 ? 'morning' : 'afternoon';

    // Generate display text — in autoFormatMode randomly alternate between formats
    const effectiveMode = this.autoFormatMode()
      ? (Math.random() < 0.5 ? 'digital' : 'german')
      : this.displayMode();
    const targetTime = effectiveMode === 'digital'
      ? this.formatTime24h(hours, minutes, timeOfDay)
      : this.generateGermanExpression(hours, minutes);

    const problem: SetClockProblem = {
      targetTime,
      correctHourAngle,
      correctMinuteAngle,
      type,
      hours,
      minutes,
      timeOfDay
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

  private formatTime24h(hours: number, minutes: number, timeOfDay: 'morning' | 'afternoon'): string {
    let hours24 = hours;
    if (hours === 0) hours24 = 12; // 0 on analog clock = 12

    // Convert to 24-hour format based on time of day
    if (timeOfDay === 'afternoon') {
      if (hours24 !== 12) {
        hours24 += 12; // PM: add 12 hours
      }
      // 12 PM stays as 12
    } else {
      // Morning: AM times
      if (hours24 === 12) {
        hours24 = 0; // 12 AM = 00:xx
      }
      // Other hours stay as they are (1-11)
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
      return Math.random() < 0.5 ? `viertel nach ${currentHourName}` : `viertel ${nextHourName}`;
    } else if (minutes === 30) {
      return `halb ${nextHourName}`;
    } else if (minutes === 45) {
      return Math.random() < 0.5 ? `viertel vor ${nextHourName}` : `dreiviertel ${nextHourName}`;
    } else if (minutes === 5) {
      return `fünf nach ${currentHourName}`;
    } else if (minutes === 10) {
      return `zehn nach ${currentHourName}`;
    } else if (minutes === 20) {
      return `zwanzig nach ${currentHourName}`;
    } else if (minutes === 25) {
      return `fünf vor halb ${nextHourName}`;
    } else if (minutes === 35) {
      return `fünf nach halb ${nextHourName}`;
    } else if (minutes === 40) {
      return `zwanzig vor ${nextHourName}`;
    } else if (minutes === 50) {
      return `zehn vor ${nextHourName}`;
    } else if (minutes === 55) {
      return `fünf vor ${nextHourName}`;
    } else {
      // Fallback for arbitrary minutes
      if (minutes < 30) {
        return `${minutes} Minuten nach ${currentHourName}`;
      } else {
        return `${60 - minutes} Minuten vor ${nextHourName}`;
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

    const isHourCorrect = this.newTypes.has(problem.type) || hourDiff <= 5 || hourDiff >= 355;
    const isMinuteCorrect = minuteDiff <= 5 || minuteDiff >= 355;

    const correct = isHourCorrect && isMinuteCorrect;
    this.isCorrect.set(correct);
    this.showFeedback.set(true);

    // Record stats
    const exerciseType = `clock-setClock-${problem.type}`;
    this.stats.recordResult(correct, exerciseType);

    this.exerciseState.handleResult(correct, () => this.generateProblem(), 1500, 2500);
  }

  private normalizeAngle(angle: number): number {
    // Normalize angle to 0-360 range
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  }

  private loadSelectedTypes(): Set<ClockExerciseType> {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = (parsed as string[]).filter((t): t is ClockExerciseType =>
            this.ALL_TYPES.includes(t as ClockExerciseType)
          );
          if (valid.length > 0) return new Set(valid);
        }
      }
    } catch {
      // ignore corrupt storage
    }
    return new Set(this.ALL_TYPES);
  }

  private saveSelectedTypes(types: Set<ClockExerciseType>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(types)));
    } catch {
      // ignore storage errors
    }
  }
}