import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SetClockExerciseComponent } from './set-clock-exercise';
import { StatsService } from '../../services/stats.service';

describe('SetClockExerciseComponent', () => {
  let component: SetClockExerciseComponent;
  let fixture: ComponentFixture<SetClockExerciseComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: StatsService,
          useValue: {
            lifetimeStatsByType: signal({}).asReadonly(),
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have exercise types', () => {
    expect(component.exerciseTypes).toEqual(['full', 'half', 'quarter', 'fiveMin']);
  });

  it('should check type selection', () => {
    component.selectedTypes.set(new Set(['full', 'half']));
    expect(component.isTypeSelected('full')).toBeTrue();
    expect(component.isTypeSelected('quarter')).toBeFalse();
  });

  it('should get type labels', () => {
    expect(component.getTypeLabel('full')).toBe('Volle Stunden');
    expect(component.getTypeLabel('half')).toBe('Halbe Stunden');
    expect(component.getTypeLabel('quarter')).toBe('Viertelstunden');
    expect(component.getTypeLabel('fiveMin')).toBe('5 Minuten');
  });

  it('should get type icons', () => {
    expect(component.getTypeIcon('full')).toBe('60');
    expect(component.getTypeIcon('half')).toBe('30');
    expect(component.getTypeIcon('quarter')).toBe('15');
    expect(component.getTypeIcon('fiveMin')).toBe('05');
  });

  it('should toggle display mode', () => {
    expect(component.displayMode()).toBe('digital');
    component.toggleDisplayMode();
    expect(component.displayMode()).toBe('german');
    component.toggleDisplayMode();
    expect(component.displayMode()).toBe('digital');
  });

  it('should get display mode label', () => {
    expect(component.getDisplayModeLabel()).toBe('24h-Format');
    component.toggleDisplayMode();
    expect(component.getDisplayModeLabel()).toBe('Deutsche Ausdrücke');
  });

  it('should get display mode icon', () => {
    expect(component.getDisplayModeIcon()).toBe('🕐');
    component.toggleDisplayMode();
    expect(component.getDisplayModeIcon()).toBe('🗣️');
  });

  it('should compute target time display after problem generation', () => {
    component.generateProblem();
    expect(component.targetTimeDisplay()).not.toBe('');
  });

  it('should set user angles', () => {
    component.onUserHourAngleChange(90);
    expect(component.userHourAngle()).toBe(90);

    component.onUserMinuteAngleChange(180);
    expect(component.userMinuteAngle()).toBe(180);
  });
});
