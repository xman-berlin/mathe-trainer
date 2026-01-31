import { Component, Input, Output, EventEmitter, signal, Signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-keypad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './keypad.component.html',
  styleUrls: ['./keypad.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KeypadComponent {
  // Configuration
  @Input() mode: 'numeric' | 'time' = 'numeric';
  @Input() value: Signal<string> = signal('');
  @Input() disabled: Signal<boolean> = signal(false);

  // Events
  @Output() valueChange = new EventEmitter<string>();
  @Output() keypadSubmit = new EventEmitter<void>();

  readonly numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  addDigit(digit: string): void {
    const current = this.value();

    if (this.mode === 'numeric') {
      // Numeric mode: max 3 digits, remove leading zeros
      if (current.length >= 3) return;
      const next = (current + digit).replace(/^0+(\d)/, '$1');
      this.valueChange.emit(next);
    } else {
      // Time mode: max 5 characters (HH:MM), auto-format with colon
      if (current.length === 2 && !current.includes(':')) {
        const next = current + ':' + digit;
        this.valueChange.emit(next);
      } else if (current.length < 5) {
        const next = current + digit;
        this.valueChange.emit(next);
      }
    }
  }

  deleteDigit(): void {
    const current = this.value();
    const next = current.length > 0 ? current.slice(0, -1) : '';
    this.valueChange.emit(next);
  }

  onSubmit(): void {
    if (this.value() === '' || this.disabled()) return;
    this.keypadSubmit.emit();
  }
}
