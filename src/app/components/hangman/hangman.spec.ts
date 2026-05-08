import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DeutschHangmanComponent } from './hangman';
import { DeutschService } from '../../services/vocab.service';
import { StatsService } from '../../services/stats.service';
import { AuthService } from '../../services/auth.service';
import type { User } from '../../models/user.model';
import type { VocabSessionWord } from '../../models/vocab.model';

function makeWord(word: string, wordId = word + '-1'): VocabSessionWord {
  return { wordId, word, listId: 'list-1', weight: 3 };
}

const MOCK_USER: User = {
  id: 'user-1',
  username: 'test',
  avatar_style: 'adventurer',
  created_at: '2025-01-01',
  last_active_at: '2025-01-01',
  math_daily_goal: 20,
  clock_daily_goal: 20,
  vocab_daily_goal: 20,
};

describe('DeutschHangmanComponent', () => {
  let component: DeutschHangmanComponent;
  let fixture: ComponentFixture<DeutschHangmanComponent>;

  let mockDeutschService: jasmine.SpyObj<DeutschService>;
  let mockStatsService: jasmine.SpyObj<StatsService>;
  let currentUserSignal: ReturnType<typeof signal<User | null>>;

  beforeEach(() => {
    currentUserSignal = signal<User | null>(null);

    mockDeutschService = jasmine.createSpyObj('DeutschService', [
      'loadUserData',
      'buildSession',
      'updateWordWeight',
    ]);

    mockStatsService = jasmine.createSpyObj('StatsService', ['recordResult']);
    const statsByTypeSignal = signal<Record<string, { correct: number; incorrect: number }>>({});
    Object.defineProperty(mockStatsService, 'statsByType', {
      get: () => statsByTypeSignal,
    });

    TestBed.configureTestingModule({
      imports: [DeutschHangmanComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: DeutschService, useValue: mockDeutschService },
        { provide: StatsService, useValue: mockStatsService },
        {
          provide: AuthService,
          useValue: { currentUser: currentUserSignal } as unknown as AuthService,
        },
      ],
    });
  });

  async function createComponent(): Promise<void> {
    fixture = TestBed.createComponent(DeutschHangmanComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  function setUser(user: User | null): void {
    currentUserSignal.set(user);
  }

  function setupWithQueue(words: VocabSessionWord[]): void {
    setUser(MOCK_USER);
    mockDeutschService.loadUserData.and.resolveTo();
    mockDeutschService.buildSession.and.resolveTo(words);
  }

  // ─── Loading & Empty States ─────────────────────────────────

  describe('initialization', () => {
    it('should show empty state when no user is logged in', async () => {
      mockDeutschService.loadUserData.and.resolveTo();
      mockDeutschService.buildSession.and.resolveTo([]);
      await createComponent();
      expect(component.sessionEmpty()).toBeTrue();
      expect(component.isLoading()).toBeFalse();
    });

    it('should show empty state when no words are available', async () => {
      setupWithQueue([]);
      await createComponent();
      expect(component.sessionEmpty()).toBeTrue();
      expect(component.isLoading()).toBeFalse();
    });

    it('should load first word when words are available', async () => {
      setupWithQueue([makeWord('Messer'), makeWord('Gabel')]);
      await createComponent();
      expect(component.sessionEmpty()).toBeFalse();
      expect(component.isLoading()).toBeFalse();
      expect(component.currentWord()).not.toBeNull();
    });

    it('should initialize guessedLetters as empty set', async () => {
      setupWithQueue([makeWord('Teller')]);
      await createComponent();
      expect(component.guessedLetters().size).toBe(0);
    });

    it('should initialize wrongGuesses as 0', async () => {
      setupWithQueue([makeWord('Teller')]);
      await createComponent();
      expect(component.wrongGuesses()).toBe(0);
    });
  });

  // ─── displayLetters ─────────────────────────────────────────

  describe('displayLetters', () => {
    it('should show all blanks for unguessed word', async () => {
      setupWithQueue([makeWord('Messer')]);
      await createComponent();
      expect(component.displayLetters()).toEqual(['_', '_', '_', '_', '_', '_']);
    });

    it('should reveal correctly guessed letters', async () => {
      setupWithQueue([makeWord('Messer')]);
      await createComponent();
      component.onLetterSelected('M');
      expect(component.displayLetters()).toEqual(['M', '_', '_', '_', '_', '_']);
    });

    it('should reveal all matching positions', async () => {
      setupWithQueue([makeWord('Messer')]);
      await createComponent();
      component.onLetterSelected('S');
      expect(component.displayLetters()).toEqual(['_', '_', 'S', 'S', '_', '_']);
    });

    it('should return empty array when no word is set', async () => {
      // Use a fresh component to avoid state leakage from previous tests
      setupWithQueue([]);
      await createComponent();
      component.currentWord.set(null);
      expect(component.displayLetters()).toEqual([]);
    });
  });

  // ─── Letter Guessing (Correct) ─────────────────────────────

  describe('correct letter guessing', () => {
    it('should add correct letter to guessedLetters', async () => {
      setupWithQueue([makeWord('Gabel')]);
      await createComponent();
      component.onLetterSelected('G');
      expect(component.guessedLetters().has('G')).toBeTrue();
    });

    it('should not increment wrongGuesses on correct guess', async () => {
      setupWithQueue([makeWord('Gabel')]);
      await createComponent();
      component.onLetterSelected('G');
      expect(component.wrongGuesses()).toBe(0);
    });

    it('should ignore repeated correct letter', async () => {
      setupWithQueue([makeWord('Gabel')]);
      await createComponent();
      component.onLetterSelected('G');
      component.onLetterSelected('G');
      expect(component.guessedLetters().size).toBe(1);
      expect(component.wrongGuesses()).toBe(0);
    });

    it('should mark word complete when all letters guessed', async () => {
      setupWithQueue([makeWord('Tasse')]);
      await createComponent();
      component.onLetterSelected('T');
      component.onLetterSelected('A');
      component.onLetterSelected('S');
      component.onLetterSelected('E');
      expect(component.isWordComplete()).toBeTrue();
    });
  });

  // ─── Letter Guessing (Wrong) ───────────────────────────────

  describe('wrong letter guessing', () => {
    it('should increment wrongGuesses on wrong letter', async () => {
      setupWithQueue([makeWord('Messer')]);
      await createComponent();
      component.onLetterSelected('X');
      expect(component.wrongGuesses()).toBe(1);
    });

    it('should count repeated wrong letter each time', async () => {
      setupWithQueue([makeWord('Messer')]);
      await createComponent();
      component.onLetterSelected('X');
      component.onLetterSelected('X');
      component.onLetterSelected('X');
      expect(component.wrongGuesses()).toBe(3);
    });

    it('should not add wrong letter to guessedLetters', async () => {
      setupWithQueue([makeWord('Messer')]);
      await createComponent();
      component.onLetterSelected('X');
      expect(component.guessedLetters().has('X')).toBeFalse();
    });

    it('should trigger game over at 6 wrong guesses', async () => {
      setupWithQueue([makeWord('Gabel')]);
      await createComponent();
      for (let i = 0; i < 6; i++) {
        component.onLetterSelected('X');
      }
      expect(component.isGameOver()).toBeTrue();
      expect(component.feedback()).toBe('incorrect');
    });
  });

  // ─── Win / Loss ─────────────────────────────────────────────

  describe('win and loss', () => {
    it('should set feedback to correct on win', async () => {
      setupWithQueue([makeWord('AB')]);
      await createComponent();
      component.onLetterSelected('A');
      component.onLetterSelected('B');
      expect(component.feedback()).toBe('correct');
      expect(component.keypadDisabled()).toBeTrue();
    });

    it('should set feedback to incorrect on loss', async () => {
      setupWithQueue([makeWord('AB')]);
      await createComponent();
      const wrongLetters = ['C', 'D', 'E', 'F', 'G', 'H'];
      for (const l of wrongLetters) {
        component.onLetterSelected(l);
      }
      expect(component.feedback()).toBe('incorrect');
      expect(component.keypadDisabled()).toBeTrue();
    });

    it('should call recordResult with true on win', async () => {
      setupWithQueue([makeWord('AB')]);
      await createComponent();
      component.onLetterSelected('A');
      component.onLetterSelected('B');
      expect(mockStatsService.recordResult).toHaveBeenCalledWith(true, 'deutsch-hangman');
    });

    it('should call recordResult with false on loss', async () => {
      setupWithQueue([makeWord('AB')]);
      await createComponent();
      for (const l of ['C', 'D', 'E', 'F', 'G', 'H']) {
        component.onLetterSelected(l);
      }
      expect(mockStatsService.recordResult).toHaveBeenCalledWith(false, 'deutsch-hangman');
    });

    it('should update word weight on win', async () => {
      setupWithQueue([makeWord('AB')]);
      await createComponent();
      component.onLetterSelected('A');
      component.onLetterSelected('B');
      expect(mockDeutschService.updateWordWeight).toHaveBeenCalledWith('user-1', 'AB-1', true);
    });

    it('should update word weight on loss', async () => {
      setupWithQueue([makeWord('AB')]);
      await createComponent();
      for (const l of ['C', 'D', 'E', 'F', 'G', 'H']) {
        component.onLetterSelected(l);
      }
      expect(mockDeutschService.updateWordWeight).toHaveBeenCalledWith('user-1', 'AB-1', false);
    });

    it('should ignore letter input when keypad is disabled', async () => {
      setupWithQueue([makeWord('AB')]);
      await createComponent();
      component.onLetterSelected('A');
      component.onLetterSelected('B');
      // keypad is now disabled after win
      component.onLetterSelected('C');
      expect(component.wrongGuesses()).toBe(0);
    });
  });

  // ─── Caterpillar Segments ───────────────────────────────────

  describe('caterpillar segments', () => {
    it('should show 0 segments lost initially', async () => {
      setupWithQueue([makeWord('Messer')]);
      await createComponent();
      expect(component.segmentsLost()).toBe(0);
    });

    it('should match wrongGuesses count', async () => {
      setupWithQueue([makeWord('Messer')]);
      await createComponent();
      component.onLetterSelected('X');
      component.onLetterSelected('Y');
      expect(component.segmentsLost()).toBe(2);
    });
  });

  // ─── Case Insensitivity ─────────────────────────────────────

  describe('case insensitivity', () => {
    it('should handle lowercase input', async () => {
      setupWithQueue([makeWord('Messer')]);
      await createComponent();
      component.onLetterSelected('m');
      expect(component.displayLetters()).toEqual(['M', '_', '_', '_', '_', '_']);
    });
  });

  // ─── No Word Repetition ─────────────────────────────────────

  describe('no consecutive word repetition', () => {
    it('should advance to next word on win', async () => {
      setupWithQueue([makeWord('AB', 'w1'), makeWord('CD', 'w2')]);
      await createComponent();
      const firstWord = component.currentWord();
      component.onLetterSelected('A');
      component.onLetterSelected('B');
      // After win, advance is called via ExerciseStateService
      await new Promise(r => setTimeout(r, 1600));
      expect(component.currentWord()).not.toEqual(firstWord);
    });
  });
});
