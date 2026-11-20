import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NumberSequenceExerciseComponent } from './number-sequence-exercise.component';
import { NumberSequenceGeneratorService } from '../../services/number-sequence-generator.service';
import { PendingNumberSequenceService } from '../../services/pending-number-sequence.service';
import { DifficultyService, DIFFICULTY_TIERS } from '../../services/difficulty.service';
import { StatsService } from '../../services/stats.service';

describe('NumberSequenceExerciseComponent', () => {
  let component: NumberSequenceExerciseComponent;
  let fixture: ComponentFixture<NumberSequenceExerciseComponent>;
  let pending: PendingNumberSequenceService;

  const fixedProblem = {
    terms: [2, 4, 6, 8, 10],
    gapIndices: [2, 4],
    step: 2,
    kind: 'arithmetic' as const,
    level: 2,
  };

  beforeEach(() => {
    localStorage.removeItem('schlaufuchs-pending-number-sequence');

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: NumberSequenceGeneratorService,
          useValue: {
            generate: jasmine.createSpy('generate').and.returnValue({ ...fixedProblem }),
          },
        },
        PendingNumberSequenceService,
        {
          provide: DifficultyService,
          useValue: {
            getTier: () => DIFFICULTY_TIERS[1],
            getLevel: () => 2,
            getMaxLevel: () => 5,
            getState: () => ({ level: 2, streak: 0, recentResults: [] }),
            getTierForLevel: (level: number) =>
              DIFFICULTY_TIERS[Math.min(Math.max(level, 1), 6) - 1],
            recordResult: jasmine.createSpy('recordResult'),
            ensureAtLeast: jasmine.createSpy('ensureAtLeast'),
            lastLevelUp: signal<{ type: string } | null>(null),
            lastLevelDown: signal<{ type: string } | null>(null),
            clearLastLevelUp: jasmine.createSpy('clearLastLevelUp'),
            clearLastLevelDown: jasmine.createSpy('clearLastLevelDown'),
          },
        },
        {
          provide: StatsService,
          useValue: {
            statsByType: signal({}).asReadonly(),
            recordResult: jasmine.createSpy('recordResult'),
            getBestStreak: jasmine.createSpy('getBestStreak').and.returnValue(0),
            updateBestStreak: jasmine.createSpy('updateBestStreak'),
          },
        },
      ],
    });

    pending = TestBed.inject(PendingNumberSequenceService);
    fixture = TestBed.createComponent(NumberSequenceExerciseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and show a sequence', () => {
    expect(component).toBeTruthy();
    expect(component.currentProblem()?.terms).toEqual([2, 4, 6, 8, 10]);
    expect(fixture.nativeElement.querySelector('.sequence-row')).toBeTruthy();
  });

  it('should advance to next empty gap on submit, then check when complete', () => {
    component.onKeypadValue('6');
    component.onKeypadSubmit();
    expect(component.activeGapSlot()).toBe(1);
    expect(component.fillHint()).toBeTrue();

    component.onKeypadValue('10');
    component.onKeypadSubmit();
    expect(component.feedback()).toBe('correct');
  });

  it('should mark incorrect answers and allow gap selection', () => {
    component.onKeypadValue('5');
    component.selectGapSlot(1);
    component.onKeypadValue('9');
    component.onKeypadSubmit();
    expect(component.feedback()).toBe('incorrect');
    expect(component.isGapWrong(0)).toBeTrue();
  });

  it('should persist and restore unfinished work', () => {
    component.onKeypadValue('6');
    const saved = pending.load();
    expect(saved?.gapAnswers[0]).toBe('6');

    const fixture2 = TestBed.createComponent(NumberSequenceExerciseComponent);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();
    expect(component2.gapAnswers()[0]).toBe('6');
    expect(component2.currentProblem()?.terms).toEqual([2, 4, 6, 8, 10]);
  });
});
