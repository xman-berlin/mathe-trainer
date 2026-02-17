import { Component, signal, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { StatsService } from './services/stats.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly title = signal('Schlaufuchs 🦊');
  showGoalConfetti = signal(false);
  private stats = inject(StatsService);

  constructor() {
    // Track goal achievement for confetti
    effect(() => {
      if (this.stats.isGoalReached()) {
        const today = new Date().toISOString().split('T')[0];
        const key = 'schlaufuchs-goal-reached-today';
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
}
