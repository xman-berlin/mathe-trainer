import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WordProblemExerciseComponent } from './word-problem-exercise.component';
import { WordProblemService } from '../../services/word-problem.service';
import { StatsService } from '../../services/stats.service';

describe('WordProblemExerciseComponent', () => {
  let component: WordProblemExerciseComponent;
  let fixture: ComponentFixture<WordProblemExerciseComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: WordProblemService,
          useValue: {
            generateProblem: jasmine.createSpy('generateProblem').and.returnValue({
              storyText: 'Test story',
              correctAnswer: 10,
              templateId: 'test',
            }),
            getTemplateIcon: jasmine.createSpy('getTemplateIcon').and.returnValue('🍎'),
          },
        },
        {
          provide: StatsService,
          useValue: {
            statsByType: signal({}).asReadonly(),
            currentMathNumberRange: signal(100).asReadonly(),
            recordResult: jasmine.createSpy('recordResult'),
            getBestStreak: jasmine.createSpy('getBestStreak').and.returnValue(5),
            updateBestStreak: jasmine.createSpy('updateBestStreak'),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(WordProblemExerciseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute story text', () => {
    expect(component.storyText()).toBe('Test story');
  });

  it('should compute correct answer', () => {
    expect(component.correctAnswer()).toBe(10);
  });

  it('should compute keypad disabled when feedback is not idle', () => {
    component.feedback.set('idle');
    expect(component.keypadDisabled()).toBeFalse();

    component.feedback.set('correct');
    expect(component.keypadDisabled()).toBeTrue();
  });

  it('should return operator symbol', () => {
    expect(component.operatorSymbol('addition')).toBe('+');
    expect(component.operatorSymbol('subtraction')).toBe('−');
    expect(component.operatorSymbol('multiplication')).toBe('×');
    expect(component.operatorSymbol('division')).toBe('÷');
  });

  it('should check type selection', () => {
    component.selectedTypes.set(new Set(['addition', 'subtraction']));
    expect(component.isTypeSelected('addition')).toBeTrue();
    expect(component.isTypeSelected('multiplication')).toBeFalse();
  });

  it('should toggle type', () => {
    component.selectedTypes.set(new Set(['addition', 'subtraction']));
    component.toggleType('subtraction');
    expect(component.selectedTypes().has('subtraction')).toBeFalse();
    expect(component.selectedTypes().has('addition')).toBeTrue();
  });

  it('should not remove last type', () => {
    component.selectedTypes.set(new Set(['addition']));
    component.toggleType('addition');
    expect(component.selectedTypes().has('addition')).toBeTrue();
  });

  it('should add type when not selected', () => {
    component.selectedTypes.set(new Set(['addition']));
    component.toggleType('subtraction');
    expect(component.selectedTypes().has('subtraction')).toBeTrue();
  });

  // ─── mathNumberRange integration ────────────────────────────

  describe('mathNumberRange integration', () => {
    it('generateProblem should pass currentMathNumberRange as third arg to wordProblemService', () => {
      const mockWordProblemService = TestBed.inject(WordProblemService) as jasmine.SpyObj<WordProblemService>;
      // Trigger a new problem generation by calling generateProblem directly
      (component as unknown as { generateProblem: () => void }).generateProblem();
      const calls = (mockWordProblemService.generateProblem as jasmine.Spy).calls.all();
      const lastCall = calls[calls.length - 1];
      // Third argument should be the currentMathNumberRange value (100 from mock)
      expect(lastCall.args[2]).toBe(100);
    });
  });
});
