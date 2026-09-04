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
              kind: 'one-step',
              type: 'addition',
              storyText: 'Test story',
              correctAnswer: 10,
              templateId: 'test',
              operandA: 4,
              operandB: 6,
            }),
            getTemplateIcon: jasmine.createSpy('getTemplateIcon').and.returnValue('🍎'),
            gradeTwoStep: jasmine.createSpy('gradeTwoStep').and.returnValue({
              rechnungCorrect: true,
              antwortCorrect: true,
              isCorrect: true,
            }),
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
    const busProblem = {
      kind: 'two-step' as const,
      type: 'two-step' as const,
      theme: 'money-family' as const,
      storyText:
        'Bobbi fährt mit seinen Eltern mit dem Bus. Eine Erwachsenenkarte kostet 17€. Kinder bezahlen 6€ weniger. Wie viel muss die Familie bezahlen?',
      icon: '🚌',
      templateId: 'money-family-tickets',
      givenNumbers: [17, 6],
      intermediateValues: [11],
      expectedAddends: [17, 17, 11],
      correctAnswer: 45,
      unit: 'euro' as const,
      sampleRechnung: '17 € + 17 € + 11 € = 45 €',
      sampleAntwort: 'Die Familie bezahlt 45€.',
      answerKeywords: ['familie', 'eltern', 'bezal', 'zahl'],
      numberRange: 'bis100' as const,
    };

    it('should show Rechnung and Antwort fields for two-step problems', () => {
      component.currentProblem.set(busProblem);
      fixture.detectChanges();

      expect(component.isTwoStep()).toBeTrue();
      const rechnung = fixture.nativeElement.querySelector('.rechnung-input');
      const antwort = fixture.nativeElement.querySelector('.antwort-input');
      expect(rechnung).toBeTruthy();
      expect(antwort).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.hint').textContent).toContain(
        'Schreibe die Rechnung und eine Antwort'
      );
    });

    it('should grade both fields on submit', () => {
      const mockWordProblemService = TestBed.inject(WordProblemService) as jasmine.SpyObj<WordProblemService>;
      component.currentProblem.set(busProblem);
      component.userRechnung.set('17 + 17 + 11 = 45');
      component.userAntwort.set('Die Familie bezahlt 45€.');
      component.feedback.set('idle');

      component.submitAnswer();

      expect(mockWordProblemService.gradeTwoStep).toHaveBeenCalledWith(
        '17 + 17 + 11 = 45',
        'Die Familie bezahlt 45€.',
        busProblem
      );
      expect(component.feedback()).toBe('correct');
    });

    it('should not submit two-step when a field is empty', () => {
      const mockWordProblemService = TestBed.inject(WordProblemService) as jasmine.SpyObj<WordProblemService>;
      (mockWordProblemService.gradeTwoStep as jasmine.Spy).calls.reset();
      component.currentProblem.set(busProblem);
      component.userRechnung.set('17 + 17 + 11 = 45');
      component.userAntwort.set('');
      component.feedback.set('idle');

      component.submitAnswer();

      expect(mockWordProblemService.gradeTwoStep).not.toHaveBeenCalled();
      expect(component.feedback()).toBe('idle');
    });
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
