import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ClockExerciseComponent } from './clock-exercise';
import { ClockService } from '../../services/clock';
import { StatsService } from '../../services/stats.service';
import { TimedChallengeService } from '../../services/timed-challenge.service';

describe('ClockExerciseComponent', () => {
  let component: ClockExerciseComponent;
  let fixture: ComponentFixture<ClockExerciseComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: {} },
            data: of({}),
          },
        },
        {
          provide: ClockService,
          useValue: {
            generateProblem: jasmine.createSpy('generateProblem').and.returnValue({
              hours: 10,
              minutes: 0,
              correctAnswer: '10:00',
              timeOfDay: 'morning',
            }),
            getTimeOfDayLabel: jasmine.createSpy('getTimeOfDayLabel').and.returnValue('Vormittag'),
            getTypeLabel: jasmine.createSpy('getTypeLabel').and.returnValue('Volle Stunde'),
            getTypeIcon: jasmine.createSpy('getTypeIcon').and.returnValue('🕐'),
            isValidFormat: jasmine.createSpy('isValidFormat').and.returnValue(true),
            isCorrect: jasmine.createSpy('isCorrect').and.returnValue(true),
          },
        },
        {
          provide: StatsService,
          useValue: {
            lifetimeStatsByType: signal({}).asReadonly(),
            statsByType: signal({}).asReadonly(),
            recordResult: jasmine.createSpy('recordResult'),
          },
        },
        {
          provide: TimedChallengeService,
          useValue: {
            getBestForTypes: jasmine.createSpy('getBestForTypes').and.returnValue(null),
            recordResult: jasmine.createSpy('recordResult').and.returnValue(false),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(ClockExerciseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start in practice mode', () => {
    expect(component.mode()).toBe('practice');
  });

  it('should have exercise types', () => {
    expect(component.exerciseTypes).toEqual(['full', 'half', 'quarter', 'fiveMin']);
  });

  it('should check type selection', () => {
    component.selectedTypes.set(new Set(['full', 'half']));
    expect(component.isTypeSelected('full')).toBeTrue();
    expect(component.isTypeSelected('quarter')).toBeFalse();
  });

  it('should have initial problem', () => {
    expect(component.currentProblem()).not.toBeNull();
  });

  it('should compute time of day label', () => {
    expect(component.timeOfDayLabel()).toBe('Vormittag');
  });

  it('should compute time trial accuracy', () => {
    component.timeTrialTotal.set(10);
    component.timeTrialCorrect.set(7);
    expect(component.timeTrialAccuracy()).toBe(70);

    component.timeTrialTotal.set(0);
    expect(component.timeTrialAccuracy()).toBe(0);
  });

  it('should get type label', () => {
    expect(component.getTypeLabel('full')).toBe('Volle Stunde');
  });

  it('should get type icon', () => {
    expect(component.getTypeIcon('full')).toBe('🕐');
  });
});
