import { Component, Input, Output, EventEmitter, signal, Signal, ChangeDetectionStrategy, HostListener, inject, ElementRef, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-keypad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './keypad.component.html',
  styleUrls: ['./keypad.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'tabindex': '0',
    '[class.keypad-focused]': 'isFocused'
  }
})
export class KeypadComponent implements AfterViewInit {
  // Configuration
  @Input() mode: 'numeric' | 'time' = 'numeric';
  @Input() value: Signal<string> = signal('');
  @Input() disabled: Signal<boolean> = signal(false);

  // Events
  @Output() valueChange = new EventEmitter<string>();
  @Output() keypadSubmit = new EventEmitter<void>();

  readonly numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  private elementRef = inject(ElementRef);
  isFocused = false;
  private previousValue = '';

  constructor() {
    // Re-focus when value is reset (new problem generated)
    effect(() => {
      const currentValue = this.value();
      if (this.previousValue !== '' && currentValue === '') {
        // Value was reset, re-focus the keypad after a short delay
        setTimeout(() => {
          this.focusKeypad();
        }, 150);
      }
      this.previousValue = currentValue;
    });
  }

  ngAfterViewInit(): void {
    // Auto-focus the keypad so keyboard works immediately
    setTimeout(() => {
      this.focusKeypad();
    }, 100);
  }

  private focusKeypad(): void {
    try {
      this.elementRef.nativeElement.focus();
    } catch {
      // Silently ignore focus errors
    }
  }

  @HostListener('keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    // Check if disabled
    if (this.disabled()) return;

    const key = event.key;

    // Handle number keys
    if (/^[0-9]$/.test(key)) {
      event.preventDefault();
      this.addDigit(key);
      return;
    }

    // Handle backspace/delete
    if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault();
      this.deleteDigit();
      return;
    }

    // Handle enter
    if (key === 'Enter') {
      event.preventDefault();
      this.onSubmit();
      return;
    }
  }

  @HostListener('focus')
  onFocus(): void {
    this.isFocused = true;
  }

  @HostListener('blur')
  onBlur(): void {
    this.isFocused = false;
  }

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
