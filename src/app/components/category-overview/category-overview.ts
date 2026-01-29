import { Component, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { StatsService } from '../../services/stats.service';

@Component({
  standalone: true,
  selector: 'app-category-overview',
  imports: [RouterLink],
  templateUrl: './category-overview.html',
  styleUrl: './category-overview.css'
})
export class CategoryOverviewComponent {
  protected stats = inject(StatsService);
  private route = inject(ActivatedRoute);

  // For future: get category from route data
  // For now, hardcode 'math'
  category: 'math' | 'clock' = 'math';

  getCategoryTitle(): string {
    return this.category === 'math' ? '📐 Mathe' : '🕐 Uhrzeit';
  }

  getCategoryDescription(): string {
    return this.category === 'math'
      ? 'Trainiere Addition, Subtraktion, Multiplikation und Division!'
      : 'Lerne die Uhr zu lesen';
  }

  getBasePath(): string {
    return this.category === 'math' ? '/mathe' : '/uhrzeit';
  }
}
