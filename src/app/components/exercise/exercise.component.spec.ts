import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ExerciseComponent } from './exercise.component';
import { StatsService } from '../../services/stats.service';
import { AchievementsService } from '../../services/achievements.service';
import { TimedChallengeService } from '../../services/timed-challenge.service';
import { ProblemGeneratorService } from '../../services/problem-generator.service';
import { DifficultyService } from '../../services/difficulty.service';
import { SupabaseService } from '../../services/supabase.service';

describe('ExerciseComponent', () => {
  let component: ExerciseComponent;
  let fixture: ComponentFixture<ExerciseComponent>;
  let mockSupabase: jasmine.SpyObj<SupabaseService>;

  beforeEach(() => {
    mockSupabase = jasmine.createSpyObj('SupabaseService', [
      'getDifficultyLevels',
      'updateDifficultyLevels',
    ]);
    mockSupabase.getDifficultyLevels.and.resolveTo(null);
    mockSupabase.updateDifficultyLevels.and.resolveTo();

    TestBed.configureTestingModule({
      imports: [FormsModule],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: SupabaseService, useValue: mockSupabase },
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
            currentMathNumberRange: signal(100).asReadonly(),
            recordResult: jasmine.createSpy('recordResult'),
            getBestStreak: jasmine.createSpy('getBestStreak').and.returnValue(0),
            updateBestStreak: jasmine.createSpy('updateBestStreak'),
            setMathNumberRange: jasmine.createSpy('setMathNumberRange'),
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

  // ─── Level-change popup (regression: must not re-fire after being consumed) ─

  it('should show level-up popup when lastLevelUp is set', () => {
    const difficultyService = TestBed.inject(DifficultyService);
    expect(component.showLevelUp()).toBeFalse();

    difficultyService.lastLevelUp.set({ type: 'addition', level: 4 });
    TestBed.flushEffects();

    expect(component.showLevelUp()).toBeTrue();
    expect(component.levelUpInfo()?.direction).toBe('up');
    // Event must be consumed immediately so the effect cannot re-fire it
    expect(difficultyService.lastLevelUp()).toBeNull();
  });

  it('should show level-down popup when lastLevelDown is set', () => {
    const difficultyService = TestBed.inject(DifficultyService);
    expect(component.showLevelUp()).toBeFalse();

    difficultyService.lastLevelDown.set({ type: 'addition', level: 2 });
    TestBed.flushEffects();

    expect(component.showLevelUp()).toBeTrue();
    expect(component.levelUpInfo()?.direction).toBe('down');
    expect(difficultyService.lastLevelDown()).toBeNull();
  });

  it('should NOT re-show popup after event is consumed and another result is recorded', () => {
    const difficultyService = TestBed.inject(DifficultyService);

    // Trigger and consume level-up event
    difficultyService.lastLevelUp.set({ type: 'addition', level: 4 });
    TestBed.flushEffects();
    expect(difficultyService.lastLevelUp()).toBeNull(); // consumed

    // Manually dismiss popup to simulate auto-dismiss
    component.showLevelUp.set(false);

    // Recording another result changes _levels signal, which could re-run the effect
    difficultyService.recordResult('addition', true);
    TestBed.flushEffects();

    // Popup must NOT re-appear — lastLevelUp is still null
    expect(component.showLevelUp()).toBeFalse();
    expect(difficultyService.lastLevelUp()).toBeNull();
  });

  it('should NOT re-show level-down popup after event is consumed and another result is recorded', () => {
    const difficultyService = TestBed.inject(DifficultyService);

    difficultyService.lastLevelDown.set({ type: 'subtraction', level: 2 });
    TestBed.flushEffects();
    expect(difficultyService.lastLevelDown()).toBeNull();

    component.showLevelUp.set(false);

    // Two more wrong answers — not enough to level down again (recentResults was reset)
    difficultyService.recordResult('subtraction', false);
    difficultyService.recordResult('subtraction', false);
    TestBed.flushEffects();

    expect(component.showLevelUp()).toBeFalse();
    expect(difficultyService.lastLevelDown()).toBeNull();
  });

  it('popup should display correct tier emoji and name on level-up', () => {
    const difficultyService = TestBed.inject(DifficultyService);

    difficultyService.lastLevelUp.set({ type: 'addition', level: 3 });
    TestBed.flushEffects();

    const info = component.levelUpInfo();
    expect(info).not.toBeNull();
    expect(info!.emoji).toBe('🐺'); // level 3 = Wolf
    expect(info!.name).toBe('Wolf');
    expect(info!.direction).toBe('up');
  });

  it('popup should display correct tier emoji and name on level-down', () => {
    const difficultyService = TestBed.inject(DifficultyService);

    difficultyService.lastLevelDown.set({ type: 'addition', level: 2 });
    TestBed.flushEffects();

    const info = component.levelUpInfo();
    expect(info).not.toBeNull();
    expect(info!.emoji).toBe('🦊'); // level 2 = Fuchs
    expect(info!.name).toBe('Fuchs');
    expect(info!.direction).toBe('down');
  });

  it('second independent level-up event should still show popup', () => {
    const difficultyService = TestBed.inject(DifficultyService);

    // First event
    difficultyService.lastLevelUp.set({ type: 'addition', level: 4 });
    TestBed.flushEffects();
    expect(component.showLevelUp()).toBeTrue();
    expect(difficultyService.lastLevelUp()).toBeNull();

    component.showLevelUp.set(false);

    // Second independent event (different type)
    difficultyService.lastLevelUp.set({ type: 'subtraction', level: 4 });
    TestBed.flushEffects();
    expect(component.showLevelUp()).toBeTrue();
    expect(difficultyService.lastLevelUp()).toBeNull();
  });
});
