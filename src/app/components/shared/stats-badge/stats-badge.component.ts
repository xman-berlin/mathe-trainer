import { Component, Input, Signal, signal, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-stats-badge',
  standalone: true,
  imports: [],
  templateUrl: './stats-badge.component.html',
  styleUrls: ['./stats-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsBadgeComponent {
  // Input: Statistics
  @Input() correctCount: Signal<number> = signal(0);
  @Input() incorrectCount: Signal<number> = signal(0);

  // Input: Display options
  @Input() showTotal = false;
  @Input() layout: 'horizontal' | 'compact' = 'horizontal';

  // Computed
  totalCount = computed(() => this.correctCount() + this.incorrectCount());
}
