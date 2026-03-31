import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LetterSelectorComponent } from './letter-selector.component';

describe('LetterSelectorComponent', () => {
  let component: LetterSelectorComponent;
  let fixture: ComponentFixture<LetterSelectorComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [LetterSelectorComponent],
      providers: [provideZonelessChangeDetection()],
    });
    fixture = TestBed.createComponent(LetterSelectorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  // ─── Initialization ─────────────────────────────────────────

  describe('initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have QWERTZ rows', () => {
      expect(component.rows.length).toBe(4);
    });

    it('should have 10 letters in first row (Q-P)', () => {
      expect(component.rows[0].length).toBe(10);
    });

    it('should have umlauts in last row', () => {
      expect(component.rows[3]).toEqual(['Ä', 'Ö', 'Ü', 'ß']);
    });
  });

  // ─── Letter Selection ───────────────────────────────────────

  describe('letter selection', () => {
    it('should emit letterSelected on selectLetter', () => {
      const spy = jasmine.createSpy('letterSelected');
      component.letterSelected.subscribe(spy);
      component.selectLetter('A');
      expect(spy).toHaveBeenCalledWith('A');
    });

    it('should emit uppercase letter', () => {
      const spy = jasmine.createSpy('letterSelected');
      component.letterSelected.subscribe(spy);
      component.selectLetter('a');
      expect(spy).toHaveBeenCalledWith('a');
    });

    it('should not emit when disabled', () => {
      Object.defineProperty(component, 'disabled', { get: () => signal(true) });
      const spy = jasmine.createSpy('letterSelected');
      component.letterSelected.subscribe(spy);
      component.selectLetter('A');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ─── Replay Audio ───────────────────────────────────────────

  describe('replay audio', () => {
    it('should emit replayAudio on onReplayAudio', () => {
      const spy = jasmine.createSpy('replayAudio');
      component.replayAudio.subscribe(spy);
      component.onReplayAudio();
      expect(spy).toHaveBeenCalled();
    });
  });

  // ─── DOM Rendering ──────────────────────────────────────────

  describe('DOM rendering', () => {
    it('should render all letter buttons', () => {
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll('.letter-key');
      // 10 + 9 + 7 + 4 = 30 letters
      expect(buttons.length).toBe(30);
    });

    it('should show replay button by default', () => {
      fixture.detectChanges();
      const replay = fixture.nativeElement.querySelector('.replay-key');
      expect(replay).toBeTruthy();
    });

    it('should hide replay button when showReplay is false', async () => {
      const fixture2 = TestBed.createComponent(LetterSelectorComponent);
      fixture2.componentInstance.showReplay = false;
      fixture2.detectChanges();
      await fixture2.whenStable();
      const replay = fixture2.nativeElement.querySelector('.replay-key');
      expect(replay).toBeFalsy();
    });
  });

  // ─── Keyboard Focus ─────────────────────────────────────────

  describe('keyboard interaction', () => {
    it('should set isFocused on focus', () => {
      component.onFocus();
      expect(component.isFocused).toBeTrue();
    });

    it('should unset isFocused on blur', () => {
      component.isFocused = true;
      component.onBlur();
      expect(component.isFocused).toBeFalse();
    });
  });
});
