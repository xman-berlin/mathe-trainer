import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StatsService } from '../../services/stats.service';
import { CoinsService } from '../../services/coins.service';
import { UserProfileComponent } from '../user-profile/user-profile.component';
import { StreakDisplayComponent } from '../streak-display/streak-display.component';

@Component({
  standalone: true,
  selector: 'app-category-home',
  imports: [RouterLink, FormsModule, UserProfileComponent, StreakDisplayComponent],
  templateUrl: './category-home.html',
  styleUrl: './category-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryHomeComponent {
  protected stats = inject(StatsService);
  protected coins = inject(CoinsService);

  showGoalEditor = signal(false);
  showClockGoalEditor = signal(false);
  showDeutschGoalEditor = signal(false);
  editGoalValue = signal(20);

  exerciseTypes = ['addition', 'subtraction', 'multiplication', 'division'];
  clockTypes = ['clock-full', 'clock-half', 'clock-quarter', 'clock-fiveMin', 'clock-setClock-full', 'clock-setClock-half', 'clock-setClock-quarter', 'clock-setClock-fiveMin'];

  // Computed stats for MATH exercises only
  readonly mathCorrectCount = computed(() => {
    const types = this.stats.statsByType();
    let total = 0;
    for (const type of this.exerciseTypes) {
      total += types[type]?.correct ?? 0;
    }
    return total;
  });

  readonly mathIncorrectCount = computed(() => {
    const types = this.stats.statsByType();
    let total = 0;
    for (const type of this.exerciseTypes) {
      total += types[type]?.incorrect ?? 0;
    }
    return total;
  });

  readonly mathTotalCount = computed(() => this.mathCorrectCount() + this.mathIncorrectCount());

  // Computed stats for CLOCK exercises only
  readonly clockCorrectCount = computed(() => {
    const types = this.stats.statsByType();
    let total = 0;
    for (const type of this.clockTypes) {
      total += types[type]?.correct ?? 0;
    }
    return total;
  });

  readonly clockIncorrectCount = computed(() => {
    const types = this.stats.statsByType();
    let total = 0;
    for (const type of this.clockTypes) {
      total += types[type]?.incorrect ?? 0;
    }
    return total;
  });

  readonly clockTotalCount = computed(() => this.clockCorrectCount() + this.clockIncorrectCount());

  // Goal progress for MATH only
  readonly mathGoalProgressPercent = computed(() =>
    Math.min(100, Math.round((this.mathCorrectCount() / this.stats.currentGoal()) * 100))
  );
  readonly isMathGoalReached = computed(() => this.mathCorrectCount() >= this.stats.currentGoal());

  // Goal progress for CLOCK only
  readonly clockGoalProgressPercent = computed(() =>
    Math.min(100, Math.round((this.clockCorrectCount() / this.stats.currentClockGoal()) * 100))
  );
  readonly isClockGoalReached = computed(() => this.clockCorrectCount() >= this.stats.currentClockGoal());

  // Deutsch incorrect count
  readonly deutschIncorrectCount = computed(() => {
    const types = this.stats.statsByType();
    return types['deutsch-rechtschreibung']?.incorrect ?? 0;
  });

  getTypeStats(type: string) {
    const types = this.stats.statsByType();
    return types[type] || { correct: 0, incorrect: 0 };
  }

  getExerciseLabel(type: string): string {
    const labels: Record<string, string> = {
      'addition': '➕ Addition',
      'subtraction': '➖ Subtraktion',
      'multiplication': '✕ Multiplikation',
      'division': '÷ Division'
    };
    return labels[type] || type;
  }

  editGoal(): void {
    this.editGoalValue.set(this.stats.currentGoal());
    this.showGoalEditor.set(true);
  }

  saveGoal(): void {
    this.stats.setDailyGoal(this.editGoalValue());
    this.showGoalEditor.set(false);
  }

  cancelGoalEdit(): void {
    this.showGoalEditor.set(false);
  }

  editClockGoal(): void {
    this.editGoalValue.set(this.stats.currentClockGoal());
    this.showClockGoalEditor.set(true);
  }

  saveClockGoal(): void {
    this.stats.setClockDailyGoal(this.editGoalValue());
    this.showClockGoalEditor.set(false);
  }

  cancelClockGoalEdit(): void {
    this.showClockGoalEditor.set(false);
  }

  editDeutschGoal(): void {
    this.editGoalValue.set(this.stats.currentDeutschGoal());
    this.showDeutschGoalEditor.set(true);
  }

  saveDeutschGoal(): void {
    this.stats.setDeutschDailyGoal(this.editGoalValue());
    this.showDeutschGoalEditor.set(false);
  }

  cancelDeutschGoalEdit(): void {
    this.showDeutschGoalEditor.set(false);
  }
}
