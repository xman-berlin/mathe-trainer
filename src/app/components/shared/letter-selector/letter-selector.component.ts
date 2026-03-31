import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  Signal,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef,
  AfterViewInit,
  inject,
} from '@angular/core';

const QWERTZ_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Y', 'X', 'C', 'V', 'B', 'N', 'M'],
  ['Ä', 'Ö', 'Ü', 'ß'],
];

@Component({
  selector: 'app-letter-selector',
  standalone: true,
  imports: [],
  templateUrl: './letter-selector.component.html',
  styleUrls: ['./letter-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    tabindex: '0',
    '[class.keypad-focused]': 'isFocused',
  },
})
export class LetterSelectorComponent implements AfterViewInit {
  @Input() disabled: Signal<boolean> = signal(false);
  @Input() usedLetters: Signal<Set<string>> = signal(new Set());
  @Input() showReplay = true;

  @Output() letterSelected = new EventEmitter<string>();
  @Output() replayAudio = new EventEmitter<void>();

  readonly rows = QWERTZ_ROWS;
  isFocused = false;

  private elementRef = inject(ElementRef);

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

    if (key.length === 1) {
      event.preventDefault();
      this.selectLetter(key.toUpperCase());
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

  selectLetter(letter: string): void {
    if (this.disabled()) return;
    this.letterSelected.emit(letter);
  }

  onReplayAudio(): void {
    this.replayAudio.emit();
  }
}
