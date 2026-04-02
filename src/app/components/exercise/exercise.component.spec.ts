import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ExerciseComponent } from './exercise.component';
import { StatsService } from '../../services/stats.service';
import { AchievementsService } from '../../services/achievements.service';
import { TimedChallengeService } from '../../services/timed-challenge.service';
import { ProblemGeneratorService } from '../../services/problem-generator.service';

describe('ExerciseComponent', () => {
  let component: ExerciseComponent;
  let fixture: ComponentFixture<ExerciseComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { mode: 'practice' } },
            data: of({ mode: 'practice' }),
          },
        },
        {
          provide: StatsService,
          useValue: {
            lifetimeStatsByType: signal({}).asReadonly(),
            statsByType: signal({}).asReadonly(),
            recordResult: jasmine.createSpy('recordResult'),
            getBestStreak: jasmine.createSpy('getBestStreak').and.returnValue(0),
            updateBestStreak: jasmine.createSpy('updateBestStreak'),
          },
        },
        {
          provide: AchievementsService,
          useValue: {
            recordMultiplicationResult: jasmine.createSpy('recordMultiplicationResult'),
          },
        },
        {
          provide: TimedChallengeService,
          useValue: {
            getBestForTypes: jasmine.createSpy('getBestForTypes').and.returnValue(null),
            recordResult: jasmine.createSpy('recordResult').and.returnValue(false),
          },
        },
        {
          provide: ProblemGeneratorService,
          useValue: {
            generateProblem: jasmine.createSpy('generateProblem').and.returnValue({
              operation: 'addition',
              operandA: 5,
              operandB: 3,
            }),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(ExerciseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute operator symbol', () => {
    component.currentType.set('addition');
    expect(component.operatorSymbol()).toBe('+');

    component.currentType.set('subtraction');
    expect(component.operatorSymbol()).toBe('−');

    component.currentType.set('multiplication');
    expect(component.operatorSymbol()).toBe('×');

    component.currentType.set('division');
    expect(component.operatorSymbol()).toBe('÷');
  });

  it('should compute correct answer', () => {
    component.currentType.set('addition');
    component.operandA.set(5);
    component.operandB.set(3);
    expect(component.correctAnswer()).toBe(8);

    component.currentType.set('subtraction');
    component.operandA.set(10);
    component.operandB.set(3);
    expect(component.correctAnswer()).toBe(7);

    component.currentType.set('multiplication');
    component.operandA.set(4);
    component.operandB.set(3);
    expect(component.correctAnswer()).toBe(12);
  });

  it('should start in practice mode', () => {
    expect(component.mode()).toBe('practice');
  });

  it('should track selected types', () => {
    expect(component.selectedTypes().size).toBeGreaterThan(0);
  });

  it('should check type selection', () => {
    component.selectedTypes.set(new Set(['addition']));
    expect(component.isTypeSelected('addition')).toBeTrue();
    expect(component.isTypeSelected('subtraction')).toBeFalse();
  });

  it('should check number selection', () => {
    component.selectedNumbers.set(new Set([3, 5]));
    expect(component.isNumberSelected(3)).toBeTrue();
    expect(component.isNumberSelected(4)).toBeFalse();
  });

  it('should check all numbers selected', () => {
    component.selectedNumbers.set(new Set());
    expect(component.allNumbersSelected()).toBeTrue();

    component.selectedNumbers.set(new Set([3]));
    expect(component.allNumbersSelected()).toBeFalse();
  });

  it('should compute time trial accuracy', () => {
    component.timeTrialTotal.set(10);
    component.timeTrialCorrect.set(8);
    expect(component.timeTrialAccuracy()).toBe(80);
  });

  it('should compute keypad disabled', () => {
    component.feedback.set('idle');
    expect(component.keypadDisabled()).toBeFalse();

    component.feedback.set('correct');
    expect(component.keypadDisabled()).toBeTrue();
  });
});
