import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-clock-display',
  templateUrl: './clock-display.html',
  styleUrl: './clock-display.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClockDisplayComponent {
  // Inputs
  hours = input.required<number>();    // 0-11
  minutes = input.required<number>();  // 0, 15, 30, 45

  // Computed angles for clock hands
  readonly hourAngle = computed(() => {
    const h = this.hours();
    const m = this.minutes();
    // Hour hand moves 30° per hour + 0.5° per minute
    return (h * 30) + (m * 0.5);
  });

  readonly minuteAngle = computed(() => {
    const m = this.minutes();
    // Minute hand moves 6° per minute
    return m * 6;
  });

  // Hour markers (1-12)
  readonly hourMarkers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // Minute tick marks (0-59)
  readonly minuteTickMarks = Array.from({ length: 60 }, (_, i) => i);

  /**
   * Get position for hour number on clock face
   */
  getHourPosition(hour: number): { x: number; y: number } {
    const angle = (hour * 30 - 90) * (Math.PI / 180);
    const radius = 80;
    return {
      x: 100 + radius * Math.cos(angle),
      y: 100 + radius * Math.sin(angle)
    };
  }

  /**
   * Returns whether this minute tick is an hour tick (every 5 minutes)
   */
  isHourTick(minute: number): boolean {
    return minute % 5 === 0;
  }

  /**
   * Get start/end coordinates for a minute tick mark
   */
  getMinuteTick(minute: number): { x1: number; y1: number; x2: number; y2: number } {
    const angle = (minute * 6 - 90) * (Math.PI / 180);
    const outerRadius = 92;
    const innerRadius = this.isHourTick(minute) ? 84 : 88;
    return {
      x1: 100 + outerRadius * Math.cos(angle),
      y1: 100 + outerRadius * Math.sin(angle),
      x2: 100 + innerRadius * Math.cos(angle),
      y2: 100 + innerRadius * Math.sin(angle),
    };
  }
}
