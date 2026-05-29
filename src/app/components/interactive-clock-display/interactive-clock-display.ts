import { Component, input, output, signal, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-interactive-clock-display',
  standalone: true,
  templateUrl: './interactive-clock-display.html',
  styleUrls: ['./interactive-clock-display.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InteractiveClockDisplayComponent implements AfterViewInit, OnChanges {
  // Target time (what student should match)
  targetHours = input.required<number>();
  targetMinutes = input.required<number>();

  /** When true, hour hand is pre-set to correctHourAngle and cannot be dragged. */
  lockHourHand = input<boolean>(false);
  /** Pre-set angle for the hour hand when lockHourHand is true. */
  initialHourAngle = input<number>(0);

  // User's current hand positions
  userHourAngle = output<number>();
  userMinuteAngle = output<number>();

  // Interactive state
  isDraggingHour = signal(false);
  isDraggingMinute = signal(false);
  currentHourAngle = signal(0);
  currentMinuteAngle = signal(0);

  // DOM reference
  @ViewChild('clockSvg', { static: true }) clockSvg!: ElementRef<SVGSVGElement>;

  // Event handler references for cleanup
  private mouseMoveHandler?: (event: MouseEvent) => void;
  private touchMoveHandler?: (event: TouchEvent) => void;
  private endHandler?: (event: MouseEvent | TouchEvent) => void;

  // Clock properties
  private readonly centerX = 100;
  private readonly centerY = 100;
  private readonly radius = 80;

  ngAfterViewInit(): void {
    this.syncHourHandLock();
    this.emitAngles();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reset hands when a new problem loads (target time changed)
    if (changes['targetHours'] || changes['targetMinutes']) {
      this.currentMinuteAngle.set(0);
      if (!this.lockHourHand()) {
        this.currentHourAngle.set(0);
      }
    }
    this.syncHourHandLock();
  }

  private syncHourHandLock(): void {
    if (this.lockHourHand()) {
      this.currentHourAngle.set(this.initialHourAngle());
    }
  }

  startDrag(hand: 'hour' | 'minute', event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (hand === 'hour' && this.lockHourHand()) return;

    if (hand === 'hour') {
      this.isDraggingHour.set(true);
    } else {
      this.isDraggingMinute.set(true);
    }

    this.updateDrag(event);
    this.addGlobalListeners();
  }

  private updateDrag(event: MouseEvent | TouchEvent): void {
    event.preventDefault();

    const rect = this.clockSvg.nativeElement.getBoundingClientRect();
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

    // Convert screen coordinates to SVG coordinates
    // viewBox is 200x200, but rendered size may differ
    const scaleX = 200 / rect.width;
    const scaleY = 200 / rect.height;

    const x = (clientX - rect.left) * scaleX - this.centerX;
    const y = (clientY - rect.top) * scaleY - this.centerY;

    const angle = this.calculateAngleFromPosition(x, y);

    if (this.isDraggingHour()) {
      this.currentHourAngle.set(angle);
    } else if (this.isDraggingMinute()) {
      this.currentMinuteAngle.set(angle);
    }

    this.emitAngles();
  }

  private endDrag(): void {
    this.isDraggingHour.set(false);
    this.isDraggingMinute.set(false);
    this.removeGlobalListeners();
  }

  private addGlobalListeners(): void {
    this.mouseMoveHandler = (event: MouseEvent) => {
      event.preventDefault();
      this.updateDrag(event);
    };
    this.touchMoveHandler = (event: TouchEvent) => {
      event.preventDefault();
      this.updateDrag(event);
    };
    this.endHandler = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      this.endDrag();
    };

    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
    document.addEventListener('mouseup', this.endHandler);
    document.addEventListener('touchend', this.endHandler);
  }

  private removeGlobalListeners(): void {
    if (this.mouseMoveHandler) {
      document.removeEventListener('mousemove', this.mouseMoveHandler);
      this.mouseMoveHandler = undefined;
    }
    if (this.touchMoveHandler) {
      document.removeEventListener('touchmove', this.touchMoveHandler);
      this.touchMoveHandler = undefined;
    }
    if (this.endHandler) {
      document.removeEventListener('mouseup', this.endHandler);
      document.removeEventListener('touchend', this.endHandler);
      this.endHandler = undefined;
    }
  }

  calculateAngleFromPosition(x: number, y: number): number {
    // Math.atan2 gives angle relative to positive X-axis (3 o'clock = 0°)
    // We want 12 o'clock = 0°, so add 90° (since SVG y-axis points down)
    const angle = Math.atan2(y, x) * (180 / Math.PI) + 90;

    // Normalize to 0-360 range
    const normalizedAngle = (angle + 360) % 360;

    // Snap to 5-degree increments for precision
    const snappedAngle = Math.round(normalizedAngle / 5) * 5;

    return snappedAngle;
  }

  private emitAngles(): void {
    this.userHourAngle.emit(this.currentHourAngle());
    this.userMinuteAngle.emit(this.currentMinuteAngle());
  }

  // Computed properties for template
  readonly hourAngle = this.currentHourAngle;
  readonly minuteAngle = this.currentMinuteAngle;

  // Hour markers (1-12)
  readonly hourMarkers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // Minute tick marks (0-59)
  readonly minuteTickMarks = Array.from({ length: 60 }, (_, i) => i);

  /**
   * Get position for hour number on clock face
   */
  getHourPosition(hour: number): { x: number; y: number } {
    const angle = (hour * 30 - 90) * (Math.PI / 180); // Convert to radians, -90 to start at 12
    const radius = 80; // Distance from center
    return {
      x: this.centerX + radius * Math.cos(angle),
      y: this.centerY + radius * Math.sin(angle)
    };
  }

  /**
   * Get start and end positions for a minute tick line on the clock rim.
   * Hour positions (every 5 minutes) get a longer tick; others get a shorter tick.
   */
  getMinuteTick(minute: number): { x1: number; y1: number; x2: number; y2: number } {
    const isHourPosition = minute % 5 === 0;
    const outerRadius = 93;
    const innerRadius = isHourPosition ? 85 : 89;
    const angle = (minute * 6 - 90) * (Math.PI / 180); // 6° per minute, -90 to start at 12
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x1: this.centerX + outerRadius * cos,
      y1: this.centerY + outerRadius * sin,
      x2: this.centerX + innerRadius * cos,
      y2: this.centerY + innerRadius * sin,
    };
  }

  isHourTick(minute: number): boolean {
    return minute % 5 === 0;
  }
}