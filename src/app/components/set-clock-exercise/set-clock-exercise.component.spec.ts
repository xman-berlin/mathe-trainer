import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SetClockExerciseComponent, ClockExerciseType } from './set-clock-exercise';
import { StatsService } from '../../services/stats.service';

/** Build a lifetime stats object with the given count for every type. */
function allTypesWithCount(count: number): Record<string, number> {
  return {
    'clock-setClock-full': count,
    'clock-setClock-half': count,
    'clock-setClock-quarter': count,
    'clock-setClock-fiveMin': count,
  };
}

describe('SetClockExerciseComponent', () => {
  let component: SetClockExerciseComponent;
  let fixture: ComponentFixture<SetClockExerciseComponent>;
  const lifetimeStats = signal<Record<string, number>>({});

  beforeEach(() => {
    lifetimeStats.set({});
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: StatsService,
          useValue: {
            lifetimeStatsByType: lifetimeStats.asReadonly(),
            statsByType: signal({}).asReadonly(),
            recordResult: jasmine.createSpy('recordResult'),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(SetClockExerciseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── Basic creation ───────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have all four exercise types', () => {
    expect(component.exerciseTypes).toEqual(['full', 'half', 'quarter', 'fiveMin']);
  });

  // ─── Type labels / icons ──────────────────────────────────────────────────

  it('should return correct type labels', () => {
    expect(component.getTypeLabel('full')).toBe('Volle Stunden');
    expect(component.getTypeLabel('half')).toBe('Halbe Stunden');
    expect(component.getTypeLabel('quarter')).toBe('Viertelstunden');
    expect(component.getTypeLabel('fiveMin')).toBe('5 Minuten');
  });

  it('should return correct type icons', () => {
    expect(component.getTypeIcon('full')).toBe('60');
    expect(component.getTypeIcon('half')).toBe('30');
    expect(component.getTypeIcon('quarter')).toBe('15');
    expect(component.getTypeIcon('fiveMin')).toBe('05');
  });

  // ─── Type selection ───────────────────────────────────────────────────────

  it('should report selected types correctly', () => {
    component.selectedTypes.set(new Set(['full', 'half']));
    expect(component.isTypeSelected('full')).toBeTrue();
    expect(component.isTypeSelected('quarter')).toBeFalse();
  });

  it('should add a type when toggling an unselected type', () => {
    component.selectedTypes.set(new Set(['full']));
    component.toggleType('half');
    expect(component.isTypeSelected('half')).toBeTrue();
  });

  it('should deselect a type when it is unlocked and not the last one', () => {
    // Unlock 'full' by giving it ≥ 100 answers
    lifetimeStats.set({ 'clock-setClock-full': 100 });
    component.selectedTypes.set(new Set(['full', 'half']));
    component.toggleType('full');
    expect(component.isTypeSelected('full')).toBeFalse();
  });

  it('should not deselect the last remaining type even when unlocked', () => {
    lifetimeStats.set({ 'clock-setClock-full': 100 });
    component.selectedTypes.set(new Set(['full']));
    component.toggleType('full');
    expect(component.isTypeSelected('full')).toBeTrue();
  });

  it('should not deselect a locked type (< 100 lifetime answers)', () => {
    // lifetimeStats is empty → all types locked
    component.selectedTypes.set(new Set(['full', 'half']));
    component.toggleType('full');
    expect(component.isTypeSelected('full')).toBeTrue();
  });

  // ─── Locked types ─────────────────────────────────────────────────────────

  it('should report all types locked when lifetime stats are empty', () => {
    const types: ClockExerciseType[] = ['full', 'half', 'quarter', 'fiveMin'];
    for (const t of types) {
      expect(component.isTypeLocked(t)).toBeTrue();
    }
  });

  it('should report a type unlocked once it reaches 100 lifetime answers', () => {
    lifetimeStats.set({ 'clock-setClock-half': 100 });
    expect(component.isTypeLocked('half')).toBeFalse();
    expect(component.isTypeLocked('full')).toBeTrue(); // others still locked
  });

  it('should keep a type locked when it has exactly 99 answers', () => {
    lifetimeStats.set({ 'clock-setClock-full': 99 });
    expect(component.isTypeLocked('full')).toBeTrue();
  });

  // ─── autoFormatMode ───────────────────────────────────────────────────────

  it('should have autoFormatMode false when any type is still locked', () => {
    expect(component.autoFormatMode()).toBeFalse();
  });

  it('should have autoFormatMode false when only some types are unlocked', () => {
    lifetimeStats.set({ 'clock-setClock-full': 100, 'clock-setClock-half': 100 });
    expect(component.autoFormatMode()).toBeFalse();
  });

  it('should have autoFormatMode true when all four types reach 100 answers', () => {
    lifetimeStats.set(allTypesWithCount(100));
    expect(component.autoFormatMode()).toBeTrue();
  });

  it('should have autoFormatMode true when all types exceed 100 answers', () => {
    lifetimeStats.set(allTypesWithCount(999));
    expect(component.autoFormatMode()).toBeTrue();
  });

  // ─── Display mode toggle ──────────────────────────────────────────────────

  it('should start in digital display mode', () => {
    expect(component.displayMode()).toBe('digital');
  });

  it('should toggle display mode between digital and german', () => {
    component.toggleDisplayMode();
    expect(component.displayMode()).toBe('german');
    component.toggleDisplayMode();
    expect(component.displayMode()).toBe('digital');
  });

  it('should return correct display mode label', () => {
    expect(component.getDisplayModeLabel()).toBe('24h-Format');
    component.toggleDisplayMode();
    expect(component.getDisplayModeLabel()).toBe('Deutsche Ausdrücke');
  });

  it('should return correct display mode icon', () => {
    expect(component.getDisplayModeIcon()).toBe('🕐');
    component.toggleDisplayMode();
    expect(component.getDisplayModeIcon()).toBe('🗣️');
  });

  // ─── Problem generation ───────────────────────────────────────────────────

  it('should generate a problem on init', () => {
    expect(component.currentProblem()).not.toBeNull();
  });

  it('should produce a non-empty target time after generateProblem', () => {
    component.generateProblem();
    expect(component.targetTimeDisplay()).not.toBe('');
  });

  it('should reset user angles to 0 after generateProblem', () => {
    component.userHourAngle.set(90);
    component.userMinuteAngle.set(180);
    component.generateProblem();
    expect(component.userHourAngle()).toBe(0);
    expect(component.userMinuteAngle()).toBe(0);
  });

  it('should hide feedback after generateProblem', () => {
    component.showFeedback.set(true);
    component.generateProblem();
    expect(component.showFeedback()).toBeFalse();
  });

  it('should generate only full-hour times when type is "full"', () => {
    component.selectedTypes.set(new Set(['full']));
    for (let i = 0; i < 20; i++) {
      component.generateProblem();
      expect(component.currentProblem()!.minutes).toBe(0);
    }
  });

  it('should generate only half-hour times when type is "half"', () => {
    component.selectedTypes.set(new Set(['half']));
    for (let i = 0; i < 20; i++) {
      component.generateProblem();
      expect(component.currentProblem()!.minutes).toBe(30);
    }
  });

  it('should generate only :15 or :45 minutes when type is "quarter"', () => {
    component.selectedTypes.set(new Set(['quarter']));
    for (let i = 0; i < 30; i++) {
      component.generateProblem();
      expect([15, 45]).toContain(component.currentProblem()!.minutes);
    }
  });

  it('should generate only multiples of 5 when type is "fiveMin"', () => {
    component.selectedTypes.set(new Set(['fiveMin']));
    for (let i = 0; i < 30; i++) {
      component.generateProblem();
      expect(component.currentProblem()!.minutes % 5).toBe(0);
    }
  });

  it('should generate hours in range 0–11', () => {
    for (let i = 0; i < 30; i++) {
      component.generateProblem();
      const h = component.currentProblem()!.hours;
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(11);
    }
  });

  it('should produce a digital HH:MM string when displayMode is digital', () => {
    component.displayMode.set('digital');
    component.generateProblem();
    expect(/^\d{2}:\d{2}$/.test(component.targetTimeDisplay())).toBeTrue();
  });

  it('should produce a non-HH:MM string when displayMode is german', () => {
    component.displayMode.set('german');
    component.generateProblem();
    expect(/^\d{2}:\d{2}$/.test(component.targetTimeDisplay())).toBeFalse();
  });

  it('should produce both formats across many problems when autoFormatMode is active', () => {
    lifetimeStats.set(allTypesWithCount(100));
    const formats = new Set<'digital' | 'german'>();
    for (let i = 0; i < 100; i++) {
      component.generateProblem();
      const display = component.targetTimeDisplay();
      formats.add(/^\d{2}:\d{2}$/.test(display) ? 'digital' : 'german');
      if (formats.size === 2) break;
    }
    expect(formats.has('digital')).toBeTrue();
    expect(formats.has('german')).toBeTrue();
  });

  // ─── isGermanDisplay ──────────────────────────────────────────────────────

  it('should be false initially (no problem yet before init)', () => {
    // After init a problem exists; reset to null to check baseline
    component.currentProblem.set(null);
    expect(component.isGermanDisplay()).toBeFalse();
  });

  it('should be false when target time is a digital HH:MM string', () => {
    component.displayMode.set('digital');
    component.generateProblem();
    expect(component.isGermanDisplay()).toBeFalse();
  });

  it('should be true when target time is a German expression', () => {
    component.displayMode.set('german');
    component.generateProblem();
    expect(component.isGermanDisplay()).toBeTrue();
  });

  it('isGermanDisplay should always match the actual format of the target string', () => {
    for (let i = 0; i < 20; i++) {
      component.generateProblem();
      const isGerman = component.isGermanDisplay();
      const looksDigital = /^\d{1,2}:\d{2}$/.test(component.targetTimeDisplay());
      expect(isGerman).toBe(!looksDigital);
    }
  });

  // ─── targetHours / targetMinutes ─────────────────────────────────────────

  it('should expose targetHours and targetMinutes from the current problem', () => {
    component.generateProblem();
    const p = component.currentProblem()!;
    expect(component.targetHours()).toBe(p.hours);
    expect(component.targetMinutes()).toBe(p.minutes);
  });

  it('should return 0 for targetHours and targetMinutes when no problem exists', () => {
    component.currentProblem.set(null);
    expect(component.targetHours()).toBe(0);
    expect(component.targetMinutes()).toBe(0);
  });

  // ─── Clock interaction ────────────────────────────────────────────────────

  it('should update userHourAngle when onUserHourAngleChange is called', () => {
    component.onUserHourAngleChange(90);
    expect(component.userHourAngle()).toBe(90);
  });

  it('should update userMinuteAngle when onUserMinuteAngleChange is called', () => {
    component.onUserMinuteAngleChange(180);
    expect(component.userMinuteAngle()).toBe(180);
  });

  // ─── Submission ───────────────────────────────────────────────────────────

  it('should show feedback after submitAnswer', () => {
    component.generateProblem();
    component.submitAnswer();
    expect(component.showFeedback()).toBeTrue();
  });

  it('should mark answer as correct when angles match within 5° tolerance', () => {
    component.generateProblem();
    const p = component.currentProblem()!;
    component.userHourAngle.set(p.correctHourAngle);
    component.userMinuteAngle.set(p.correctMinuteAngle);
    component.submitAnswer();
    expect(component.isCorrect()).toBeTrue();
  });

  it('should mark answer as incorrect when hour angle is far off', () => {
    component.generateProblem();
    const p = component.currentProblem()!;
    // Set minute correct but hour wildly wrong (90° off)
    component.userHourAngle.set((p.correctHourAngle + 90) % 360);
    component.userMinuteAngle.set(p.correctMinuteAngle);
    component.submitAnswer();
    expect(component.isCorrect()).toBeFalse();
  });

  it('should not submit twice (noop when feedback already shown)', () => {
    const statsService = TestBed.inject(StatsService);
    component.generateProblem();
    component.submitAnswer();
    const callCountAfterFirst = (statsService.recordResult as jasmine.Spy).calls.count();
    component.submitAnswer(); // second call should be ignored
    expect((statsService.recordResult as jasmine.Spy).calls.count()).toBe(callCountAfterFirst);
  });

  it('should record stats with the correct exercise type key on submit', () => {
    const statsService = TestBed.inject(StatsService);
    component.selectedTypes.set(new Set(['full']));
    component.generateProblem();
    const p = component.currentProblem()!;
    component.userHourAngle.set(p.correctHourAngle);
    component.userMinuteAngle.set(p.correctMinuteAngle);
    component.submitAnswer();
    expect(statsService.recordResult).toHaveBeenCalledWith(true, `clock-setClock-${p.type}`);
  });
});
