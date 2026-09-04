import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WordProblemExerciseComponent } from './word-problem-exercise.component';
import { WordProblemService } from '../../services/word-problem.service';
import { StatsService } from '../../services/stats.service';
import { resetTwoStepRotation } from '../../services/two-step-word-problem';

describe('WordProblemExerciseComponent', () => {
  let component: WordProblemExerciseComponent;
  let fixture: ComponentFixture<WordProblemExerciseComponent>;
  let wordProblemService: WordProblemService;

  function showTwoStepOnly() {
    resetTwoStepRotation();
    component.selectedTypes.set(new Set(['two-step']));
    component.generateProblem();
    fixture.detectChanges();
  }

  function showOneStepType(type: 'addition' | 'subtraction' | 'multiplication' | 'division') {
    component.selectedTypes.set(new Set([type]));
    component.generateProblem();
    fixture.detectChanges();
  }

  beforeEach(() => {
    resetTwoStepRotation();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        WordProblemService,
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

    wordProblemService = TestBed.inject(WordProblemService);
    fixture = TestBed.createComponent(WordProblemExerciseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should select two-step and classic operations together by default', () => {
    expect(component.isTypeSelected('two-step')).toBeTrue();
    expect(component.isTypeSelected('addition')).toBeTrue();
    expect(component.isTypeSelected('subtraction')).toBeTrue();
    expect(component.isTypeSelected('multiplication')).toBeTrue();
    expect(component.isTypeSelected('division')).toBeTrue();
  });

  it('should compute keypad disabled when feedback is not idle', () => {
    component.feedback.set('idle');
    expect(component.keypadDisabled()).toBeFalse();

    component.feedback.set('correct');
    expect(component.keypadDisabled()).toBeTrue();
  });

  it('should return operator symbol', () => {
    expect(component.operatorSymbol('two-step')).toBe('2+');
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

  describe('two-step mixed with keypad', () => {
    beforeEach(() => {
      showTwoStepOnly();
    });

    it('should render the Bobbi template with keypad answer input', () => {
      expect(component.storyText()).toContain(
        'Bobbi fährt mit seinen Eltern mit dem Bus. Eine Erwachsenenkarte kostet 17€.'
      );
      expect(component.correctAnswer()).toBe(45);
      expect(component.isTwoStep()).toBeTrue();
      expect(fixture.nativeElement.querySelector('.story-text').textContent).toContain('Bobbi');
      expect(fixture.nativeElement.querySelector('app-keypad')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.answer-input')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.rechnung-input')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('.antwort-input')).toBeFalsy();
    });

    it('should grade two-step by final number only', () => {
      component.userAnswer.set('45');
      component.feedback.set('idle');

      component.submitAnswer();

      expect(component.feedback()).toBe('correct');
    });

    it('should accept the Lilo ages problem on the next generate', () => {
      component.generateProblem();
      fixture.detectChanges();

      expect(component.storyText()).toContain('Lilo ist 12 Jahre alt');
      expect(component.correctAnswer()).toBe(38);

      component.userAnswer.set('38');
      component.submitAnswer();

      expect(component.feedback()).toBe('correct');
    });

    it('should not submit when answer is empty', () => {
      component.userAnswer.set('');
      component.feedback.set('idle');

      component.submitAnswer();

      expect(component.feedback()).toBe('idle');
    });
  });

  describe('classic one-step mode', () => {
    beforeEach(() => {
      showOneStepType('addition');
    });

    it('should show the numeric keypad for classic stories', () => {
      expect(component.isTwoStep()).toBeFalse();
      expect(component.currentType()).toBe('addition');
      expect(fixture.nativeElement.querySelector('app-keypad')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.answer-input')).toBeTruthy();
    });

    it('should grade a numeric one-step answer', () => {
      component.userAnswer.set(String(component.correctAnswer()));
      component.feedback.set('idle');

      component.submitAnswer();

      expect(component.feedback()).toBe('correct');
    });
  });

  describe('mathNumberRange integration', () => {
    it('generateProblem should pass currentMathNumberRange as third arg to wordProblemService', () => {
      const generateSpy = spyOn(wordProblemService, 'generateProblem').and.callThrough();
      component.generateProblem();
      const lastCall = generateSpy.calls.mostRecent();
      expect(lastCall.args[2]).toBe(100);
    });
  });
});
