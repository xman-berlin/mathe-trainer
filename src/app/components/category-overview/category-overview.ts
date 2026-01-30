import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { StatsService } from '../../services/stats.service';

@Component({
  standalone: true,
  selector: 'app-category-overview',
  imports: [RouterLink],
  templateUrl: './category-overview.html',
  styleUrl: './category-overview.css'
})
export class CategoryOverviewComponent implements OnInit {
  protected stats = inject(StatsService);
  private route = inject(ActivatedRoute);

  category = signal<'math' | 'clock'>('math');

  // Math types
  private mathTypes = ['addition', 'subtraction', 'multiplication', 'division'];
  // Clock types
  private clockTypes = ['clock-full', 'clock-half', 'clock-quarter', 'clock-fiveMin'];

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

  ngOnInit(): void {
    // Read category from route data
    this.route.data.subscribe(data => {
      if (data['category'] === 'math' || data['category'] === 'clock') {
        this.category.set(data['category']);
      }
    });
  }

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
}
