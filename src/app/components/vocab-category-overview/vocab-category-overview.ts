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

  readonly correctCount = computed(() =>
    this.stats.statsByType()['deutsch-rechtschreibung']?.correct ?? 0
  );

  readonly incorrectCount = computed(() =>
    this.stats.statsByType()['deutsch-rechtschreibung']?.incorrect ?? 0
  );

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
