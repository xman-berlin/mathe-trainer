import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeypadComponent } from './keypad.component';

describe('KeypadComponent', () => {
  let component: KeypadComponent;
  let fixture: ComponentFixture<KeypadComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });

    fixture = TestBed.createComponent(KeypadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have numbers 1-9', () => {
    expect(component.numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('should add digit in numeric mode', () => {
    const valueSignal = signal('');
    component.value = valueSignal.asReadonly();
    component.mode = 'numeric';

    let emitted: string | undefined;
    component.valueChange.subscribe((v: string) => (emitted = v));

    component.addDigit('5');
    expect(emitted).toBe('5');
  });

  it('should limit to 3 digits in numeric mode', () => {
    const valueSignal = signal('123');
    component.value = valueSignal.asReadonly();
    component.mode = 'numeric';

    let emitted = false;
    component.valueChange.subscribe(() => (emitted = true));

    component.addDigit('4');
    expect(emitted).toBeFalse();
  });

  it('should remove leading zeros in numeric mode', () => {
    const valueSignal = signal('0');
    component.value = valueSignal.asReadonly();
    component.mode = 'numeric';

    let emitted: string | undefined;
    component.valueChange.subscribe((v: string) => (emitted = v));

    component.addDigit('5');
    expect(emitted).toBe('5');
  });

  it('should delete last digit', () => {
    const valueSignal = signal('12');
    component.value = valueSignal.asReadonly();

    let emitted: string | undefined;
    component.valueChange.subscribe((v: string) => (emitted = v));

    component.deleteDigit();
    expect(emitted).toBe('1');
  });

  it('should handle delete on empty value', () => {
    const valueSignal = signal('');
    component.value = valueSignal.asReadonly();

    let emitted: string | undefined;
    component.valueChange.subscribe((v: string) => (emitted = v));

    component.deleteDigit();
    expect(emitted).toBe('');
  });

  it('should emit submit when value is not empty', () => {
    const valueSignal = signal('42');
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

  it('should not emit submit when disabled', () => {
    const valueSignal = signal('42');
    component.value = valueSignal.asReadonly();
    component.disabled = signal(true).asReadonly();

    let submitted = false;
    component.keypadSubmit.subscribe(() => (submitted = true));

    component.onSubmit();
    expect(submitted).toBeFalse();
  });

  it('should allow first hour digit 0-2 in time mode', () => {
    const valueSignal = signal('');
    component.value = valueSignal.asReadonly();
    component.mode = 'time';

    let emitted: string | undefined;
    component.valueChange.subscribe((v: string) => (emitted = v));

    component.addDigit('2');
    expect(emitted).toBe('2');
  });

  it('should reject first hour digit > 2 in time mode', () => {
    const valueSignal = signal('');
    component.value = valueSignal.asReadonly();
    component.mode = 'time';

    let emitted = false;
    component.valueChange.subscribe(() => (emitted = true));

    component.addDigit('5');
    expect(emitted).toBeFalse();
  });

  it('should auto-add colon after 2-digit hours in time mode', () => {
    const valueSignal = signal('12');
    component.value = valueSignal.asReadonly();
    component.mode = 'time';

    let emitted: string | undefined;
    component.valueChange.subscribe((v: string) => (emitted = v));

    component.addDigit('3');
    expect(emitted).toBe('12:3');
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
