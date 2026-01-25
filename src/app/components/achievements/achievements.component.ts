import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { AchievementsService } from '../../services/achievements.service';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-achievements',
  imports: [CommonModule],
  templateUrl: './achievements.component.html',
  styleUrls: ['./achievements.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AchievementsComponent {
  achievements = inject(AchievementsService);
  reihen = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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
}
