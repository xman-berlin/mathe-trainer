import { Component, inject, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs/operators';
import { StatsService } from '../../services/stats.service';
import { StatsBadgeComponent } from '../shared/stats-badge/stats-badge.component';

@Component({
  standalone: true,
  selector: 'app-category-overview',
  imports: [RouterLink, FormsModule, StatsBadgeComponent],
  templateUrl: './category-overview.html',
  styleUrl: './category-overview.css'
})
export class CategoryOverviewComponent {
  protected stats = inject(StatsService);
  private route = inject(ActivatedRoute);

  // Read category from route data as signal
  category = toSignal(
    this.route.data.pipe(
      map(data => (data['category'] === 'clock' ? 'clock' : 'math') as 'math' | 'clock')
    ),
    { initialValue: 'math' as 'math' | 'clock' }
  );

  // Math types
  private mathTypes = ['addition', 'subtraction', 'multiplication', 'division'];
  // Clock types
  private clockTypes = ['clock-full', 'clock-half', 'clock-quarter', 'clock-fiveMin', 'clock-setClock-full', 'clock-setClock-half', 'clock-setClock-quarter', 'clock-setClock-fiveMin'];

  // Category-specific stats
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

  readonly categoryTotalCount = computed(() => this.categoryCorrectCount() + this.categoryIncorrectCount());

  readonly categoryGoalProgressPercent = computed(() => {
    const goal = this.category() === 'math' ? this.stats.currentGoal() : this.stats.currentClockGoal();
    return Math.min(100, Math.round((this.categoryCorrectCount() / goal) * 100));
  });

  readonly categoryIsGoalReached = computed(() => {
    const goal = this.category() === 'math' ? this.stats.currentGoal() : this.stats.currentClockGoal();
    return this.categoryCorrectCount() >= goal;
  });

  // Goal editor state
  showGoalEditor = signal(false);
  editGoalValue = signal(20);

  getCategoryTitle(): string {
    return this.category() === 'math' ? '📐 Mathe' : '🕐 Uhrzeit';
  }

  getCategoryDescription(): string {
    return this.category() === 'math'
      ? 'Trainiere Addition, Subtraktion, Multiplikation und Division!'
      : 'Lerne die Uhr zu lesen';
  }

  getBasePath(): string {
    return this.category() === 'math' ? '/mathe' : '/uhrzeit';
  }

  editGoal(): void {
    if (this.category() === 'math') {
      this.editGoalValue.set(this.stats.currentGoal());
    } else {
      this.editGoalValue.set(this.stats.currentClockGoal());
    }
    this.showGoalEditor.set(true);
  }

  saveGoal(): void {
    if (this.category() === 'math') {
      this.stats.setDailyGoal(this.editGoalValue());
    } else {
      this.stats.setClockDailyGoal(this.editGoalValue());
    }
    this.showGoalEditor.set(false);
  }

  cancelGoalEdit(): void {
    this.showGoalEditor.set(false);
  }
}
