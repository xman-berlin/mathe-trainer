import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LetterKeypadComponent } from './letter-keypad.component';

describe('LetterKeypadComponent', () => {
  let component: LetterKeypadComponent;
  let fixture: ComponentFixture<LetterKeypadComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });

    fixture = TestBed.createComponent(LetterKeypadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have QWERTZ rows', () => {
    expect(component.rows.length).toBe(4);
    expect(component.rows[0]).toContain('Q');
    expect(component.rows[0]).toContain('Z');
  });

  it('should append letter', () => {
    const valueSignal = signal('');
    component.value = valueSignal.asReadonly();
    component.disabled = signal(false).asReadonly();

    let emitted: string | undefined;
    component.valueChange.subscribe((v: string) => (emitted = v));

    component.appendLetter('A');
    expect(emitted).toBe('A');
  });

  it('should not append letter when disabled', () => {
    const valueSignal = signal('');
    component.value = valueSignal.asReadonly();
    component.disabled = signal(true).asReadonly();

    let emitted = false;
    component.valueChange.subscribe(() => (emitted = true));

    component.appendLetter('A');
    expect(emitted).toBeFalse();
  });

  it('should append multiple letters', () => {
    const valueSignal = signal('H');
    component.value = valueSignal.asReadonly();
    component.disabled = signal(false).asReadonly();

    let emitted: string | undefined;
    component.valueChange.subscribe((v: string) => (emitted = v));

    component.appendLetter('I');
    expect(emitted).toBe('HI');
  });

  it('should delete last letter', () => {
    const valueSignal = signal('HALLO');
    component.value = valueSignal.asReadonly();

    let emitted: string | undefined;
    component.valueChange.subscribe((v: string) => (emitted = v));

    component.deleteLetter();
    expect(emitted).toBe('HALL');
  });

  it('should handle delete on empty value', () => {
    const valueSignal = signal('');
    component.value = valueSignal.asReadonly();

    let emitted: string | undefined;
    component.valueChange.subscribe((v: string) => (emitted = v));

    component.deleteLetter();
    expect(emitted).toBe('');
  });

  it('should emit submit when value is not empty', () => {
    const valueSignal = signal('TEST');
    component.value = valueSignal.asReadonly();
    component.disabled = signal(false).asReadonly();

    let submitted = false;
    component.keypadSubmit.subscribe(() => (submitted = true));

    component.onSubmit();
    expect(submitted).toBeTrue();
  });

  it('should not emit submit when value is empty', () => {
    const valueSignal = signal('');
    component.value = valueSignal.asReadonly();
    component.disabled = signal(false).asReadonly();

    let submitted = false;
    component.keypadSubmit.subscribe(() => (submitted = true));

    component.onSubmit();
    expect(submitted).toBeFalse();
  });

  it('should emit replay audio event', () => {
    let replayed = false;
    component.replayAudio.subscribe(() => (replayed = true));

    component.onReplayAudio();
    expect(replayed).toBeTrue();
  });

  it('should set focused on focus', () => {
    component.onFocus();
    expect(component.isFocused).toBeTrue();
  });

  it('should unset focused on blur', () => {
    component.isFocused = true;
    component.onBlur();
    expect(component.isFocused).toBeFalse();
  });
});
