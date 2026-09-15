import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StatsService } from '../../services/stats.service';
import { StatsBadgeComponent } from '../shared/stats-badge/stats-badge.component';

@Component({
  selector: 'app-englisch-category-overview',
  standalone: true,
  imports: [RouterLink, FormsModule, StatsBadgeComponent],
  templateUrl: './englisch-category-overview.html',
  styleUrl: '../vocab-category-overview/vocab-category-overview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnglischCategoryOverviewComponent {
  protected stats = inject(StatsService);

  readonly correctCount = computed(() => this.stats.englischCorrectCount());
  readonly incorrectCount = computed(() => this.stats.englischIncorrectCount());

  readonly showGoalEditor = signal(false);
  editGoalValue = 10;

  editGoal(): void {
    this.editGoalValue = this.stats.currentEnglischGoal();
    this.showGoalEditor.set(true);
  }

  saveGoal(): void {
    this.stats.setEnglischDailyGoal(this.editGoalValue);
    this.showGoalEditor.set(false);
  }

  cancelGoalEdit(): void {
    this.showGoalEditor.set(false);
  }
}
