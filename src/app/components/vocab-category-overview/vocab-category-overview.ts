import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StatsService } from '../../services/stats.service';
import { StatsBadgeComponent } from '../shared/stats-badge/stats-badge.component';

@Component({
  selector: 'app-deutsch-category-overview',
  standalone: true,
  imports: [RouterLink, FormsModule, StatsBadgeComponent],
  templateUrl: './vocab-category-overview.html',
  styleUrls: ['./vocab-category-overview.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeutschCategoryOverviewComponent {
  protected stats = inject(StatsService);

  readonly correctCount = computed(() => {
    const types = this.stats.statsByType();
    let total = 0;
    for (const [type, stats] of Object.entries(types)) {
      if (type.startsWith('deutsch-')) {
        total += stats.correct ?? 0;
      }
    }
    return total;
  });

  readonly incorrectCount = computed(() => {
    const types = this.stats.statsByType();
    let total = 0;
    for (const [type, stats] of Object.entries(types)) {
      if (type.startsWith('deutsch-')) {
        total += stats.incorrect ?? 0;
      }
    }
    return total;
  });

  readonly showGoalEditor = signal(false);
  readonly editGoalValue = signal(10);

  editGoal(): void {
    this.editGoalValue.set(this.stats.currentDeutschGoal());
    this.showGoalEditor.set(true);
  }

  saveGoal(): void {
    this.stats.setDeutschDailyGoal(this.editGoalValue());
    this.showGoalEditor.set(false);
  }

  cancelGoalEdit(): void {
    this.showGoalEditor.set(false);
  }
}
