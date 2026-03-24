import { Component, inject, signal, OnInit, Input, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AchievementsService } from '../../services/achievements.service';
import { TimedChallengeService, PersonalBest } from '../../services/timed-challenge.service';
import { StatsService } from '../../services/stats.service';

type ExerciseType = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'word-problems';
type ClockExerciseType = 'clock-full' | 'clock-half' | 'clock-quarter' | 'clock-fiveMin';
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
  private route = inject(ActivatedRoute);

  @Input() category: 'math' | 'clock' = 'math';
  readonly categorySignal = signal<'math' | 'clock'>('math');
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
    { key: 'clock-fiveMin', label: '5-Minuten', icon: '🕔' }
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

  getTitle(): string {
    return this.categorySignal() === 'clock' ? '🏆 Uhrzeit-Erfolge' : '🏆 Mathe-Erfolge';
  }
}
