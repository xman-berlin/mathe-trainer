import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs/operators';
import { StatsService } from '../../services/stats.service';
import { StatsBadgeComponent } from '../shared/stats-badge/stats-badge.component';
import {
  PracticeCategory,
  tilesForCategory,
} from '../../models/practice-exercise.catalog';

@Component({
  standalone: true,
  selector: 'app-category-overview',
  imports: [RouterLink, FormsModule, StatsBadgeComponent],
  templateUrl: './category-overview.html',
  styleUrl: './category-overview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryOverviewComponent {
  protected stats = inject(StatsService);
  private route = inject(ActivatedRoute);

  category = toSignal(
    this.route.data.pipe(
      map((data) => (data['category'] === 'clock' ? 'clock' : 'math') as 'math' | 'clock')
    ),
    { initialValue: 'math' as 'math' | 'clock' }
  );

  private mathTypes = [
    'addition',
    'subtraction',
    'multiplication',
    'division',
    'word-problems',
  ];
  private clockTypes = [
    'clock-full',
    'clock-half',
    'clock-quarter',
    'clock-fiveMin',
    'clock-setClock-full',
    'clock-setClock-half',
    'clock-setClock-quarter',
    'clock-setClock-fiveMin',
    'clock-setClock-fiveMinAfter',
    'clock-setClock-fiveMinBefore',
    'clock-setClock-fiveMinHalf',
    'clock-zeitspanne',
    'clock-verspaetung',
  ];

  readonly goalTiles = computed(() => tilesForCategory(this.category()));

  readonly categoryCorrectCount = computed(() => {
    const types = this.stats.statsByType();
    const typeList = this.category() === 'math' ? this.mathTypes : this.clockTypes;
    let total = 0;
    for (const type of typeList) {
      total += types[type]?.correct ?? 0;
    }
    return total;
  });

  readonly categoryIncorrectCount = computed(() => {
    const types = this.stats.statsByType();
    const typeList = this.category() === 'math' ? this.mathTypes : this.clockTypes;
    let total = 0;
    for (const type of typeList) {
      total += types[type]?.incorrect ?? 0;
    }
    return total;
  });

  readonly categoryTotalCount = computed(
    () => this.categoryCorrectCount() + this.categoryIncorrectCount()
  );

  readonly categoryGoalCorrect = computed(() =>
    this.stats.categoryCorrectSum(this.category() as PracticeCategory)
  );

  readonly categoryGoalTotal = computed(() =>
    this.stats.categoryGoalSum(this.category() as PracticeCategory)
  );

  readonly categoryGoalProgressPercent = computed(() => {
    const goal = this.categoryGoalTotal();
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((this.categoryGoalCorrect() / goal) * 100));
  });

  readonly categoryIsGoalReached = computed(
    () => this.categoryGoalCorrect() >= this.categoryGoalTotal()
  );

  readonly categoryTitle = computed(() =>
    this.category() === 'math' ? '📐 Mathe' : '🕐 Uhrzeit'
  );

  readonly categoryDescription = computed(() =>
    this.category() === 'math'
      ? 'Trainiere Addition, Subtraktion, Multiplikation und Division!'
      : 'Lerne die Uhr zu lesen'
  );

  readonly basePath = computed(() => (this.category() === 'math' ? '/mathe' : '/uhrzeit'));

  showGoalEditor = signal(false);
  /** Draft values in the modal, keyed by exercise id */
  editGoalDraft = signal<Record<string, number>>({});

  editGoal(): void {
    const draft: Record<string, number> = {};
    for (const tile of this.goalTiles()) {
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
    this.stats.setGoalsForCategory(this.category() as PracticeCategory, this.editGoalDraft());
    this.showGoalEditor.set(false);
  }

  cancelGoalEdit(): void {
    this.showGoalEditor.set(false);
  }

  readonly mathNumberRange = computed(() => this.stats.currentMathNumberRange());
  showRangeEditor = signal(false);
  editRangeInput = signal(100);
  editRangeError = signal(false);
  readonly editRangeValid = computed(() => {
    const v = this.editRangeInput();
    return Number.isInteger(v) && v >= 100;
  });

  openRangeEditor(): void {
    this.editRangeInput.set(this.stats.currentMathNumberRange());
    this.editRangeError.set(false);
    this.showRangeEditor.set(true);
  }

  saveRange(): void {
    if (!this.editRangeValid()) {
      this.editRangeError.set(true);
      return;
    }
    this.stats.setMathNumberRange(this.editRangeInput());
    this.showRangeEditor.set(false);
  }

  cancelRangeEdit(): void {
    this.showRangeEditor.set(false);
  }
}
