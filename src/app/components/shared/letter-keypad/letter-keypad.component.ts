import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  Signal,
  ChangeDetectionStrategy,
  HostListener,
  inject,
  ElementRef,
  AfterViewInit,
  effect,
} from '@angular/core';

const QWERTZ_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Y', 'X', 'C', 'V', 'B', 'N', 'M'],
  ['Ä', 'Ö', 'Ü', 'ß'],
];

@Component({
  selector: 'app-letter-keypad',
  standalone: true,
  imports: [],
  templateUrl: './letter-keypad.component.html',
  styleUrls: ['./letter-keypad.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    tabindex: '0',
    '[class.keypad-focused]': 'isFocused',
  },
})
export class LetterKeypadComponent implements AfterViewInit {
  @Input() value: Signal<string> = signal('');
  @Input() disabled: Signal<boolean> = signal(false);

  @Output() valueChange = new EventEmitter<string>();
  @Output() keypadSubmit = new EventEmitter<void>();
  @Output() replayAudio = new EventEmitter<void>();

  readonly rows = QWERTZ_ROWS;
  isFocused = false;

  private elementRef = inject(ElementRef);
  private previousValue = '';

  constructor() {
    effect(() => {
      const currentValue = this.value();
      if (this.previousValue !== '' && currentValue === '') {
        setTimeout(() => this.focusKeypad(), 150);
      }
      this.previousValue = currentValue;
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.focusKeypad(), 100);
  }

  private focusKeypad(): void {
    try {
      this.elementRef.nativeElement.focus();
    } catch {
      // ignore
    }
  }

  @HostListener('keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;

    const key = event.key;

    if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault();
      this.deleteLetter();
      return;
    }

    if (key === 'Enter') {
      event.preventDefault();
      this.onSubmit();
      return;
    }

    // Accept printable single characters (letters, umlauts, etc.)
    if (key.length === 1) {
      event.preventDefault();
      this.appendLetter(key.toUpperCase());
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

  appendLetter(letter: string): void {
    if (this.disabled()) return;
    this.valueChange.emit(this.value() + letter);
  }

  deleteLetter(): void {
    const current = this.value();
    this.valueChange.emit(current.length > 0 ? current.slice(0, -1) : '');
  }

  onSubmit(): void {
    if (this.value() === '' || this.disabled()) return;
    this.keypadSubmit.emit();
  }

  onReplayAudio(): void {
    this.replayAudio.emit();
  }
}
