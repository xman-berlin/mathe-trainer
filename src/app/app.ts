import { Component, signal, computed, DestroyRef, inject } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StatsService } from './services/stats.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Mathe-Trainer');
  isExercisePage = signal(false);

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
        const isExercise = url.includes('/rechnen');
        this.isExercisePage.set(isExercise);
      });

    const initialUrl = this.router.url;
    const isExercise = initialUrl.includes('/rechnen');
    this.isExercisePage.set(isExercise);
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
}
