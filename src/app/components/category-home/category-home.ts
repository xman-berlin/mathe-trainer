import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StatsService } from '../../services/stats.service';

@Component({
  standalone: true,
  selector: 'app-category-home',
  imports: [RouterLink, FormsModule],
  templateUrl: './category-home.html',
  styleUrl: './category-home.css'
})
export class CategoryHomeComponent {
  protected stats = inject(StatsService);

  showGoalEditor = signal(false);
  editGoalValue = signal(20);

  exerciseTypes = ['addition', 'subtraction', 'multiplication', 'division'];

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
}
