import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StatsService } from '../../services/stats.service';
import { StatsBadgeComponent } from '../shared/stats-badge/stats-badge.component';
import { tilesForCategory } from '../../models/practice-exercise.catalog';

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

  readonly correctCount = computed(() => this.stats.deutschCorrectCount());
  readonly incorrectCount = computed(() => this.stats.deutschIncorrectCount());

  readonly goalCorrect = computed(() => this.stats.categoryCorrectSum('deutsch'));
  readonly goalTotal = computed(() => this.stats.categoryGoalSum('deutsch'));
  readonly goalProgressPercent = computed(() => this.stats.deutschGoalProgressPercent());
  readonly isGoalReached = computed(() => this.stats.isDeutschGoalReached());

  readonly goalTiles = tilesForCategory('deutsch');

  readonly showGoalEditor = signal(false);
  editGoalDraft = signal<Record<string, number>>({});

  editGoal(): void {
    const draft: Record<string, number> = {};
    for (const tile of this.goalTiles) {
      draft[tile.id] = this.stats.goalFor(tile.id);
    }
    this.editGoalDraft.set(draft);
    this.showGoalEditor.set(true);
  }

  updateDraft(exerciseId: string, value: string | number): void {
    const n = typeof value === 'number' ? value : parseInt(String(value), 10);
    this.editGoalDraft.set({
      ...this.editGoalDraft(),
      [exerciseId]: Number.isFinite(n) ? n : 1,
    });
  }

  saveGoal(): void {
    this.stats.setGoalsForCategory('deutsch', this.editGoalDraft());
    this.showGoalEditor.set(false);
  }

  cancelGoalEdit(): void {
    this.showGoalEditor.set(false);
  }
}
