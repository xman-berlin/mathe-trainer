import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StatsService } from '../../services/stats.service';
import { StatsBadgeComponent } from '../shared/stats-badge/stats-badge.component';

@Component({
  standalone: true,
  selector: 'app-category-home',
  imports: [RouterLink, FormsModule, StatsBadgeComponent],
  templateUrl: './category-home.html',
  styleUrl: './category-home.css'
})
export class CategoryHomeComponent {
  protected stats = inject(StatsService);

  showGoalEditor = signal(false);
  showClockGoalEditor = signal(false);
  editGoalValue = signal(20);

  exerciseTypes = ['addition', 'subtraction', 'multiplication', 'division'];
  clockTypes = ['clock-full', 'clock-half', 'clock-quarter', 'clock-fiveMin'];

  // Computed stats for clock exercises
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
}
