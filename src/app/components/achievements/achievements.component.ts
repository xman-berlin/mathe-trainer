import { Component, computed, inject, signal, OnInit, Input, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AchievementsService } from '../../services/achievements.service';
import { TimedChallengeService, PersonalBest } from '../../services/timed-challenge.service';
import { StatsService } from '../../services/stats.service';
import { DifficultyService } from '../../services/difficulty.service';
import type { DifficultyOperationType } from '../../models/user.model';

type ExerciseType = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'word-problems';
type ClockExerciseType = 'clock-full' | 'clock-half' | 'clock-quarter' | 'clock-fiveMin' | 'clock-setClock-full' | 'clock-setClock-half' | 'clock-setClock-quarter' | 'clock-setClock-fiveMin' | 'clock-setClock-fiveMinAfter' | 'clock-setClock-fiveMinBefore' | 'clock-setClock-fiveMinHalf' | 'clock-zeitspanne' | 'clock-verspaetung';
type MedalLevel = 'none' | 'bronze' | 'silver' | 'gold';

@Component({
  standalone: true,
  selector: 'app-achievements',
  imports: [],
  templateUrl: './achievements.component.html',
  styleUrls: ['./achievements.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AchievementsComponent implements OnInit {
  achievements = inject(AchievementsService);
  timedChallenge = inject(TimedChallengeService);
  stats = inject(StatsService);
  private difficulty = inject(DifficultyService);
  private route = inject(ActivatedRoute);

  @Input() category: 'math' | 'clock' = 'math';
  readonly categorySignal = signal<'math' | 'clock'>('math');

  readonly title = computed(() =>
    this.categorySignal() === 'clock' ? '🏆 Uhrzeit-Erfolge' : '🏆 Mathe-Erfolge'
  );

  reihen = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  exerciseTypes: { key: ExerciseType; label: string; icon: string }[] = [
    { key: 'addition', label: 'Addition', icon: '+' },
    { key: 'subtraction', label: 'Subtraktion', icon: '−' },
    { key: 'multiplication', label: 'Multiplikation', icon: '×' },
    { key: 'division', label: 'Division', icon: '÷' },
    { key: 'word-problems', label: 'Sachaufgaben', icon: '📝' }
  ];

  clockExerciseTypes: { key: ClockExerciseType; label: string; icon: string }[] = [
    { key: 'clock-full', label: 'Volle Stunde', icon: '🕐' },
    { key: 'clock-half', label: 'Halbe Stunde', icon: '🕧' },
    { key: 'clock-quarter', label: 'Viertelstunde', icon: '🕒' },
    { key: 'clock-fiveMin', label: '5 Minuten', icon: '🕔' },
    { key: 'clock-setClock-full', label: 'Zeiger: Volle Stunde', icon: '🕐' },
    { key: 'clock-setClock-half', label: 'Zeiger: Halbe Stunde', icon: '🕧' },
    { key: 'clock-setClock-quarter', label: 'Zeiger: Viertelstunde', icon: '🕒' },
    { key: 'clock-setClock-fiveMin', label: 'Zeiger: 5 Minuten', icon: '🕔' },
    { key: 'clock-setClock-fiveMinAfter', label: 'Zeiger: Minuten nach', icon: '→' },
    { key: 'clock-setClock-fiveMinBefore', label: 'Zeiger: Minuten vor', icon: '←' },
    { key: 'clock-setClock-fiveMinHalf', label: 'Zeiger: Vor/Nach halb', icon: '½' },
    { key: 'clock-zeitspanne', label: 'Zeitspannen', icon: '⏳' },
    { key: 'clock-verspaetung', label: 'Verspätung', icon: '🚌' },
  ];

  ngOnInit(): void {
    // Priority: @Input > Route data
    const routeCategory = this.route.snapshot.data['category'] as 'math' | 'clock' | undefined;
    const finalCategory = this.category || routeCategory || 'math';
    this.categorySignal.set(finalCategory);
  }

  getMastery(reihe: number) {
    return this.achievements.getMastery(reihe);
  }

  getProgressText(reihe: number): string {
    const mastery = this.getMastery(reihe);
    if (mastery.mastered) {
      return '✓';
    }
    return `${mastery.currentStreak}/10`;
  }

  isMastered(reihe: number): boolean {
    return this.getMastery(reihe).mastered;
  }

  getTimeTrialBest(type: ExerciseType | ClockExerciseType): PersonalBest | null {
    return this.timedChallenge.getBestForTypes([type]);
  }

  hasTimeTrialBest(type: ExerciseType | ClockExerciseType): boolean {
    return this.getTimeTrialBest(type) !== null;
  }

  getMedalLevel(type: ExerciseType | ClockExerciseType): MedalLevel {
    return this.stats.getMedalLevel(type);
  }

  getMedalEmoji(type: ExerciseType | ClockExerciseType): string {
    const level = this.getMedalLevel(type);
    switch (level) {
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      default: return '⭕';
    }
  }

  getMedalLabel(type: ExerciseType | ClockExerciseType): string {
    const level = this.getMedalLevel(type);
    switch (level) {
      case 'gold': return 'Gold';
      case 'silver': return 'Silber';
      case 'bronze': return 'Bronze';
      default: return 'Noch keine Medaille';
    }
  }

  getProgress(type: ExerciseType | ClockExerciseType) {
    return this.stats.getProgressToNextMedal(type);
  }

  getNextMedalLabel(type: ExerciseType | ClockExerciseType): string {
    const progress = this.getProgress(type);
    if (progress.current >= 1000) return 'Gold erreicht!';
    if (progress.current >= 500) return 'bis Gold';
    if (progress.current >= 100) return 'bis Silber';
    return 'bis Bronze';
  }

  getBackLink(): string {
    return this.categorySignal() === 'clock' ? '/uhrzeit' : '/mathe';
  }

  private readonly CORE_TYPES: DifficultyOperationType[] = ['addition', 'subtraction', 'multiplication', 'division'];

  isCoreType(type: ExerciseType | ClockExerciseType): type is DifficultyOperationType {
    return (this.CORE_TYPES as string[]).includes(type);
  }

  getDifficultyLevel(type: DifficultyOperationType): number {
    return this.difficulty.getLevel(type);
  }

  getMaxLevel(type: DifficultyOperationType): number {
    return this.difficulty.getMaxLevel(type);
  }

  getDifficultyTierName(type: DifficultyOperationType): string {
    const tier = this.difficulty.getTier(type);
    return tier.name;
  }

  getDifficultyTierEmoji(type: DifficultyOperationType): string {
    const tier = this.difficulty.getTier(type);
    return tier.emoji;
  }
}
