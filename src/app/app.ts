import { Component, signal, computed, DestroyRef, inject, effect } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StatsService } from './services/stats.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Mathe-Trainer');
  isHomePage = signal(true);

  showGoalEditor = signal(false);
  editGoalValue = signal(20);
  showGoalConfetti = signal(false);

  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  protected stats = inject(StatsService);

  constructor() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects;
        this.isHomePage.set(url === '/' || url === '');
      });

    const initialUrl = this.router.url;
    this.isHomePage.set(initialUrl === '/' || initialUrl === '');

    // Track goal achievement for confetti
    effect(() => {
      if (this.stats.isGoalReached()) {
        const today = new Date().toISOString().split('T')[0];
        const key = 'goal-reached-today';
        const stored = localStorage.getItem(key);

        if (stored !== today) {
          // Goal reached for the first time today
          localStorage.setItem(key, today);
          this.showGoalConfetti.set(true);
          setTimeout(() => this.showGoalConfetti.set(false), 3000);
        }
      }
    });
  }

  exerciseTypes = computed(() => {
    const types = this.stats.statsByType();
    return Object.keys(types).sort();
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
}
