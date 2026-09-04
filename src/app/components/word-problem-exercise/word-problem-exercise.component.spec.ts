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

  it('should render the Bobbi worksheet template from the real generator', () => {
    expect(component.storyText()).toContain(
      'Bobbi fährt mit seinen Eltern mit dem Bus. Eine Erwachsenenkarte kostet 17€.'
    );
    expect(component.correctAnswer()).toBe(45);
    expect(component.isTwoStep()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.story-text').textContent).toContain('Bobbi');
    expect(fixture.nativeElement.querySelector('.rechnung-input')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.antwort-input')).toBeTruthy();
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

  describe('two-step worksheet mode', () => {
    it('should show Rechnung and Antwort fields for the generated worksheet', () => {
      expect(component.isTwoStep()).toBeTrue();
      expect(fixture.nativeElement.querySelector('.hint').textContent).toContain(
        'Schreibe die Rechnung und eine Antwort'
      );
    });

    it('should grade the Bobbi worksheet through the real service', () => {
      const gradeSpy = spyOn(wordProblemService, 'gradeTwoStep').and.callThrough();
      component.userRechnung.set('17 + 17 + 11 = 45');
      component.userAntwort.set('Die Familie bezahlt 45€.');
      component.feedback.set('idle');

      component.submitAnswer();

      expect(gradeSpy).toHaveBeenCalled();
      expect(component.feedback()).toBe('correct');
    });

    it('should accept the Lilo ages worksheet on the next problem', () => {
      component.generateProblem();
      fixture.detectChanges();

      expect(component.storyText()).toContain('Lilo ist 12 Jahre alt');
      expect(component.correctAnswer()).toBe(38);

      component.userRechnung.set('12 + 21 + 5 = 38');
      component.userAntwort.set('Ale zusammen sind 38 Jähre.');
      component.submitAnswer();

      expect(component.feedback()).toBe('correct');
    });

    it('should not submit two-step when a field is empty', () => {
      const gradeSpy = spyOn(wordProblemService, 'gradeTwoStep');
      component.userRechnung.set('17 + 17 + 11 = 45');
      component.userAntwort.set('');
      component.feedback.set('idle');

      component.submitAnswer();

      expect(gradeSpy).not.toHaveBeenCalled();
      expect(component.feedback()).toBe('idle');
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
