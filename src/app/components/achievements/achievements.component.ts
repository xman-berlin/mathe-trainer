import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AchievementsService } from '../../services/achievements.service';
import { TimedChallengeService, PersonalBest } from '../../services/timed-challenge.service';
import { StatsService } from '../../services/stats.service';
import { CommonModule } from '@angular/common';

type ExerciseType = 'addition' | 'subtraction' | 'multiplication' | 'division';
type MedalLevel = 'none' | 'bronze' | 'silver' | 'gold';

@Component({
  standalone: true,
  selector: 'app-achievements',
  imports: [CommonModule, RouterLink],
  templateUrl: './achievements.component.html',
  styleUrls: ['./achievements.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AchievementsComponent {
  achievements = inject(AchievementsService);
  timedChallenge = inject(TimedChallengeService);
  stats = inject(StatsService);
  reihen = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  exerciseTypes: { key: ExerciseType; label: string; icon: string }[] = [
    { key: 'addition', label: 'Addition', icon: '+' },
    { key: 'subtraction', label: 'Subtraktion', icon: '−' },
    { key: 'multiplication', label: 'Multiplikation', icon: '×' },
    { key: 'division', label: 'Division', icon: '÷' }
  ];

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

  getTimeTrialBest(type: ExerciseType): PersonalBest | null {
    return this.timedChallenge.getBestForTypes([type]);
  }

  hasTimeTrialBest(type: ExerciseType): boolean {
    return this.getTimeTrialBest(type) !== null;
  }

  getMedalLevel(type: ExerciseType): MedalLevel {
    return this.stats.getMedalLevel(type);
  }

  getMedalEmoji(type: ExerciseType): string {
    const level = this.getMedalLevel(type);
    switch (level) {
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      default: return '⭕';
    }
  }

  getMedalLabel(type: ExerciseType): string {
    const level = this.getMedalLevel(type);
    switch (level) {
      case 'gold': return 'Gold';
      case 'silver': return 'Silber';
      case 'bronze': return 'Bronze';
      default: return 'Noch keine Medaille';
    }
  }

  getProgress(type: ExerciseType) {
    return this.stats.getProgressToNextMedal(type);
  }

  getNextMedalLabel(type: ExerciseType): string {
    const progress = this.getProgress(type);
    if (progress.current >= 1000) return 'Gold erreicht!';
    if (progress.current >= 500) return 'bis Gold';
    if (progress.current >= 100) return 'bis Silber';
    return 'bis Bronze';
  }
}
