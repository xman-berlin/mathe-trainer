import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatsService } from '../../services/stats.service';
import { UserProfileComponent } from '../user-profile/user-profile.component';
import { StreakDisplayComponent } from '../streak-display/streak-display.component';

@Component({
  standalone: true,
  selector: 'app-category-home',
  imports: [RouterLink, UserProfileComponent, StreakDisplayComponent],
  templateUrl: './category-home.html',
  styleUrl: './category-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryHomeComponent {
  protected stats = inject(StatsService);

  readonly mathCorrectCount = computed(() => this.stats.mathCorrectCount());
  readonly mathIncorrectCount = computed(() => this.stats.mathIncorrectCount());
  readonly mathGoalProgressCorrect = computed(() => this.stats.categoryCorrectSum('math'));
  readonly mathGoalTotal = computed(() => this.stats.categoryGoalSum('math'));
  readonly mathGoalProgressPercent = computed(() => this.stats.goalProgressPercent());
  readonly isMathGoalReached = computed(() => this.stats.isGoalReached());

  readonly clockCorrectCount = computed(() => this.stats.clockCorrectCount());
  readonly clockIncorrectCount = computed(() => this.stats.clockIncorrectCount());
  readonly clockGoalProgressCorrect = computed(() => this.stats.categoryCorrectSum('clock'));
  readonly clockGoalTotal = computed(() => this.stats.categoryGoalSum('clock'));
  readonly clockGoalProgressPercent = computed(() => this.stats.clockGoalProgressPercent());
  readonly isClockGoalReached = computed(() => this.stats.isClockGoalReached());

  readonly deutschCorrectCount = computed(() => this.stats.deutschCorrectCount());
  readonly deutschIncorrectCount = computed(() => this.stats.deutschIncorrectCount());
  readonly deutschGoalProgressCorrect = computed(() => this.stats.categoryCorrectSum('deutsch'));
  readonly deutschGoalTotal = computed(() => this.stats.categoryGoalSum('deutsch'));
  readonly deutschGoalProgressPercent = computed(() => this.stats.deutschGoalProgressPercent());
  readonly isDeutschGoalReached = computed(() => this.stats.isDeutschGoalReached());

  readonly englischCorrectCount = computed(() => this.stats.englischCorrectCount());
  readonly englischIncorrectCount = computed(() => this.stats.englischIncorrectCount());
  readonly englischGoalProgressCorrect = computed(() => this.stats.categoryCorrectSum('englisch'));
  readonly englischGoalTotal = computed(() => this.stats.categoryGoalSum('englisch'));
  readonly englischGoalProgressPercent = computed(() => this.stats.englischGoalProgressPercent());
  readonly isEnglischGoalReached = computed(() => this.stats.isEnglischGoalReached());
}
