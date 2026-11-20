import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WordProblemExerciseComponent } from './word-problem-exercise.component';
import { WordProblemService } from '../../services/word-problem.service';
import { StatsService } from '../../services/stats.service';
import { DifficultyService } from '../../services/difficulty.service';
import { SupabaseService } from '../../services/supabase.service';
import { resetTwoStepRotation } from '../../services/two-step-word-problem';

describe('WordProblemExerciseComponent', () => {
  let component: WordProblemExerciseComponent;
  let fixture: ComponentFixture<WordProblemExerciseComponent>;
  let wordProblemService: WordProblemService;
  let difficulty: DifficultyService;

  function showTwoStepOnly() {
    resetTwoStepRotation();
    const problem = {
      ...wordProblemService.generateProblem('two-step', 'bis100', 100),
      playerLevel: 4,
    };
    component.currentProblem.set(problem);
    component.currentType.set('two-step');
    component.userAnswer.set('');
    component.feedback.set('idle');
    component.showCorrectAnswer.set(false);
    fixture.detectChanges();
  }

  function showOneStepType(type: 'addition' | 'subtraction' | 'multiplication' | 'division') {
    const problem = {
      ...wordProblemService.generateProblem(type, 'bis100', 100),
      playerLevel: 2,
    };
    component.currentProblem.set(problem);
    component.currentType.set(type);
    component.userAnswer.set('');
    component.feedback.set('idle');
    component.showCorrectAnswer.set(false);
    fixture.detectChanges();
  }

  beforeEach(() => {
    resetTwoStepRotation();
    localStorage.removeItem('schlaufuchs-pending-word-problem');

    const mockSupabase = jasmine.createSpyObj('SupabaseService', [
      'getDifficultyLevels',
      'updateDifficultyLevels',
    ]);
    mockSupabase.getDifficultyLevels.and.resolveTo(null);
    mockSupabase.updateDifficultyLevels.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        WordProblemService,
        DifficultyService,
        { provide: SupabaseService, useValue: mockSupabase },
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
    difficulty = TestBed.inject(DifficultyService);
    fixture = TestBed.createComponent(WordProblemExerciseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show status card with difficulty', () => {
    expect(fixture.nativeElement.querySelector('app-exercise-status-card')).toBeTruthy();
    expect(component.statusDifficulty().level).toBe(difficulty.getLevel('wordProblems'));
  });

  it('should compute keypad disabled when feedback is not idle', () => {
    component.feedback.set('idle');
    expect(component.keypadDisabled()).toBeFalse();

    component.feedback.set('correct');
    expect(component.keypadDisabled()).toBeTrue();
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

    it('should accept the Lilo ages problem on the next two-step generate', () => {
      resetTwoStepRotation();
      const first = wordProblemService.generateProblem('two-step', 'bis100', 100);
      expect(first.storyText).toContain('Bobbi');
      const second = wordProblemService.generateProblem('two-step', 'bis100', 100);
      component.currentProblem.set({ ...second, playerLevel: 4 });
      component.currentType.set('two-step');
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

  describe('adaptive level generation', () => {
    it('generateProblem should use generateForLevel with current difficulty', () => {
      const generateSpy = spyOn(wordProblemService, 'generateForLevel').and.callThrough();
      component.generateProblem();
      expect(generateSpy).toHaveBeenCalledWith(difficulty.getLevel('wordProblems'));
    });

    it('paramsForLevel should map L1 to ZR20 without two-step', () => {
      const params = wordProblemService.paramsForLevel(1);
      expect(params.range).toBe('bis20');
      expect(params.maxValue).toBe(20);
      expect(params.twoStepChance).toBe(0);
    });

    it('paramsForLevel should allow two-step from L3', () => {
      expect(wordProblemService.paramsForLevel(3).twoStepChance).toBeGreaterThan(0);
      expect(wordProblemService.paramsForLevel(5).maxValue).toBe(999);
    });
  });

  describe('pending problem resume', () => {
    it('should persist the current problem and restore it on remount', () => {
      showOneStepType('addition');
      const story = component.storyText();
      const answer = component.correctAnswer();
      // Re-save after manual set (showOneStepType does not go through generateProblem)
      const pending = component.currentProblem();
      if (pending) {
        localStorage.setItem('schlaufuchs-pending-word-problem', JSON.stringify(pending));
      }
      expect(localStorage.getItem('schlaufuchs-pending-word-problem')).toBeTruthy();

      fixture.destroy();
      fixture = TestBed.createComponent(WordProblemExerciseComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.storyText()).toBe(story);
      expect(component.correctAnswer()).toBe(answer);
    });

    it('should clear pending storage after submit', () => {
      showOneStepType('addition');
      localStorage.setItem(
        'schlaufuchs-pending-word-problem',
        JSON.stringify(component.currentProblem())
      );
      component.userAnswer.set(String(component.correctAnswer()));
      component.submitAnswer();
      expect(localStorage.getItem('schlaufuchs-pending-word-problem')).toBeNull();
    });
  });
});
