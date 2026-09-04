import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TimeSpanExerciseComponent } from './time-span-exercise';
import { DurationService, ZeitspanneProblem, VerspaetungProblem } from '../../services/duration.service';
import { StatsService } from '../../services/stats.service';

describe('TimeSpanExerciseComponent', () => {
  let component: TimeSpanExerciseComponent;
  let fixture: ComponentFixture<TimeSpanExerciseComponent>;
  let durationService: jasmine.SpyObj<DurationService>;

  const zeitspanneProblem: ZeitspanneProblem = {
    kind: 'zeitspanne',
    startHours: 6,
    startMinutes: 45,
    endHours: 7,
    endMinutes: 30,
    durationMinutes: 45,
  };

  const verspaetungProblem: VerspaetungProblem = {
    kind: 'verspaetung',
    scheduledHours: 14,
    scheduledMinutes: 20,
    delayMinutes: 10,
    destination: 'Heldenhausen',
    newHours: 14,
    newMinutes: 30,
  };

  beforeEach(() => {
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');

    durationService = jasmine.createSpyObj('DurationService', [
      'generateProblem',
      'formatGermanTime',
      'formatDuration',
      'isTimeCorrect',
      'getTypeLabel',
      'getTypeIcon',
    ]);
    durationService.generateProblem.and.returnValue(zeitspanneProblem);
    durationService.formatGermanTime.and.callFake(
      (h: number, m: number) => (m === 0 ? `${h} Uhr` : `${h}.${String(m).padStart(2, '0')} Uhr`)
    );
    durationService.formatDuration.and.callFake((mins: number) => `${mins} min`);
    durationService.isTimeCorrect.and.returnValue(true);
    durationService.getTypeLabel.and.callFake((kind: string) =>
      kind === 'zeitspanne' ? 'Zeitspannen' : 'Verspätung'
    );
    durationService.getTypeIcon.and.callFake((kind: string) => (kind === 'zeitspanne' ? '⏳' : '🚌'));

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: DurationService, useValue: durationService },
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

    fixture = TestBed.createComponent(TimeSpanExerciseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have both exercise types', () => {
    expect(component.exerciseTypes).toEqual(['zeitspanne', 'verspaetung']);
  });

  it('should generate an initial Zeitspanne problem', () => {
    expect(component.currentProblem()).toEqual(zeitspanneProblem);
    expect(component.startTimeLabel()).toBe('6.45 Uhr');
    expect(component.endTimeLabel()).toBe('7.30 Uhr');
  });

  it('should accept 45 minutes as the correct Zeitspanne answer', () => {
    const stats = TestBed.inject(StatsService);
    component.durationMinutes.set('45');
    component.submitAnswer();

    expect(component.isCorrect()).toBeTrue();
    expect(component.showFeedback()).toBeTrue();
    expect(stats.recordResult).toHaveBeenCalledWith(true, 'clock-zeitspanne');
  });

  it('should accept 1 h 30 min via hour and minute fields', () => {
    durationService.generateProblem.and.returnValue({
      kind: 'zeitspanne',
      startHours: 16,
      startMinutes: 0,
      endHours: 17,
      endMinutes: 30,
      durationMinutes: 90,
    });
    component.generateProblem();
    component.durationHours.set('1');
    component.durationMinutes.set('30');
    component.submitAnswer();

    expect(component.isCorrect()).toBeTrue();
    expect(component.formattedUserDuration()).toBe('1 h 30 min');
  });

  it('should accept total minutes as a variant of 1 h 30 min', () => {
    durationService.generateProblem.and.returnValue({
      kind: 'zeitspanne',
      startHours: 16,
      startMinutes: 0,
      endHours: 17,
      endMinutes: 30,
      durationMinutes: 90,
    });
    component.generateProblem();
    component.durationMinutes.set('90');
    component.submitAnswer();

    expect(component.isCorrect()).toBeTrue();
  });

  it('should reject a wrong duration', () => {
    const stats = TestBed.inject(StatsService);
    component.durationMinutes.set('20');
    component.submitAnswer();

    expect(component.isCorrect()).toBeFalse();
    expect(stats.recordResult).toHaveBeenCalledWith(false, 'clock-zeitspanne');
  });

  it('should score a Verspätung answer', () => {
    durationService.generateProblem.and.returnValue(verspaetungProblem);
    durationService.isTimeCorrect.and.returnValue(true);
    component.selectedTypes.set(new Set(['verspaetung']));
    component.generateProblem();
    component.userAnswer.set('14:30');
    component.submitAnswer();

    const stats = TestBed.inject(StatsService);
    expect(component.isCorrect()).toBeTrue();
    expect(stats.recordResult).toHaveBeenCalledWith(true, 'clock-verspaetung');
  });

  it('should not submit an empty duration', () => {
    const stats = TestBed.inject(StatsService);
    component.submitAnswer();
    expect(stats.recordResult).not.toHaveBeenCalled();
    expect(component.showFeedback()).toBeFalse();
  });

  it('should keep at least one type selected', () => {
    component.selectedTypes.set(new Set(['zeitspanne']));
    component.toggleType('zeitspanne');
    expect(component.isTypeSelected('zeitspanne')).toBeTrue();
  });

  it('should switch keypad mode for Verspätung', () => {
    durationService.generateProblem.and.returnValue(verspaetungProblem);
    component.selectedTypes.set(new Set(['verspaetung']));
    component.generateProblem();
    expect(component.keypadMode()).toBe('time');
  });
});
