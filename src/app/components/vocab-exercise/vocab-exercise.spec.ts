import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DeutschRechtschreibungComponent } from './vocab-exercise';
import { DeutschService } from '../../services/vocab.service';
import { StatsService } from '../../services/stats.service';
import { AuthService } from '../../services/auth.service';
import { ExerciseStateService } from '../../services/exercise-state.service';
import type { VocabSessionWord } from '../../models/vocab.model';

function makeWord(overrides: Partial<VocabSessionWord> = {}): VocabSessionWord {
  return { wordId: 'w1', word: 'Hund', listId: 'list-1', weight: 1, ...overrides };
}

/**
 * Helper to flush all pending microtasks (Promise.then callbacks).
 * Needed because zoneless Angular doesn't track microtasks via zones,
 * so fixture.whenStable() doesn't flush them reliably.
 */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe('DeutschRechtschreibungComponent', () => {
  let component: DeutschRechtschreibungComponent;
  let fixture: ComponentFixture<DeutschRechtschreibungComponent>;
  let mockDeutschService: jasmine.SpyObj<DeutschService>;
  let mockAuthService: { currentUser: ReturnType<typeof signal<{ id: string } | null>> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockStatsService: { recordResult: jasmine.Spy; statsByType: any };
  let mockExerciseState: jasmine.SpyObj<ExerciseStateService>;

  function createComponent(): void {
    fixture = TestBed.createComponent(DeutschRechtschreibungComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit
  }

  beforeEach(() => {
    mockAuthService = {
      currentUser: signal<{ id: string } | null>({ id: 'user-1' }),
    };
    mockStatsService = {
      recordResult: jasmine.createSpy('recordResult'),
      statsByType: signal({ 'deutsch-rechtschreibung': { correct: 0, incorrect: 0 } }).asReadonly(),
    };
    mockDeutschService = jasmine.createSpyObj('DeutschService', [
      'loadUserData',
      'buildSession',
      'updateWordWeight',
    ]);
    mockDeutschService.loadUserData.and.returnValue(Promise.resolve());
    mockDeutschService.buildSession.and.returnValue(Promise.resolve([]));

    // Stub ExerciseStateService so submitAnswer does not schedule real setTimeouts
    // that would fire later and corrupt other suites (CI flake under Node 22/24).
    mockExerciseState = jasmine.createSpyObj(
      'ExerciseStateService',
      ['handleResult', 'reset', 'setMilestones'],
      {
        streak: signal(0),
        bestStreak: signal(0),
        showMilestone: signal(false),
        milestoneValue: signal(0),
        confettiPieces: [],
        confettiX: [],
      }
    );

    TestBed.configureTestingModule({
      imports: [DeutschRechtschreibungComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: DeutschService, useValue: mockDeutschService },
        { provide: StatsService, useValue: mockStatsService },
      ],
    }).overrideComponent(DeutschRechtschreibungComponent, {
      set: {
        providers: [{ provide: ExerciseStateService, useValue: mockExerciseState }],
      },
    });
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Initial state ────────────────────────────────────────────────

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('should start loading', () => {
    createComponent();
    expect(component.isLoading()).toBeTrue();
  });

  // ─── ngOnInit with no user ────────────────────────────────────────

  it('should set sessionEmpty when no user', () => {
    mockAuthService.currentUser.set(null);
    createComponent();

    // No async operations because ngOnInit returns early
    expect(component.sessionEmpty()).toBeTrue();
    expect(component.isLoading()).toBeFalse();
  });

  // ─── ngOnInit with empty session ──────────────────────────────────

  it('should set sessionEmpty when buildSession returns empty', async () => {
    mockDeutschService.buildSession.and.returnValue(Promise.resolve([]));
    createComponent();

    await flushMicrotasks();

    expect(component.sessionEmpty()).toBeTrue();
    expect(component.isLoading()).toBeFalse();
  });

  // ─── ngOnInit loads words ─────────────────────────────────────────

  it('should show first word after loading', async () => {
    mockDeutschService.buildSession.and.returnValue(Promise.resolve([
      makeWord({ wordId: 'w1', word: 'Hund' }),
      makeWord({ wordId: 'w2', word: 'Katze' }),
    ]));
    createComponent();

    await flushMicrotasks();

    expect(component.isLoading()).toBeFalse();
    expect(component.sessionEmpty()).toBeFalse();
    expect(component.currentWord()).toBeTruthy();
  });

  it('should call loadUserData and buildSession on init', async () => {
    mockDeutschService.buildSession.and.returnValue(Promise.resolve([
      makeWord({ wordId: 'w1', word: 'Hund' }),
    ]));
    createComponent();

    await flushMicrotasks();

    expect(mockDeutschService.loadUserData).toHaveBeenCalledWith('user-1');
    expect(mockDeutschService.buildSession).toHaveBeenCalledWith('user-1');
    expect(component.currentWord()?.word).toBe('Hund');
  });

  // ─── submitAnswer ─────────────────────────────────────────────────

  it('should mark correct answer', async () => {
    mockDeutschService.buildSession.and.returnValue(Promise.resolve([
      makeWord({ wordId: 'w1', word: 'Hund' }),
      makeWord({ wordId: 'w2', word: 'Katze' }),
    ]));
    createComponent();
    await flushMicrotasks();

    component.userAnswer.set('Hund');
    component.submitAnswer();

    expect(component.feedback()).toBe('correct');
    expect(mockStatsService.recordResult).toHaveBeenCalledWith(true, 'deutsch-rechtschreibung');
    expect(mockDeutschService.updateWordWeight).toHaveBeenCalledWith('user-1', 'w1', true);
  });

  it('should mark incorrect answer and show correct word', async () => {
    mockDeutschService.buildSession.and.returnValue(Promise.resolve([
      makeWord({ wordId: 'w1', word: 'Hund' }),
      makeWord({ wordId: 'w2', word: 'Katze' }),
    ]));
    createComponent();
    await flushMicrotasks();

    component.userAnswer.set('Falsch');
    component.submitAnswer();

    expect(component.feedback()).toBe('incorrect');
    expect(component.correctAnswer()).toBe('Hund');
    expect(mockStatsService.recordResult).toHaveBeenCalledWith(false, 'deutsch-rechtschreibung');
    expect(mockDeutschService.updateWordWeight).toHaveBeenCalledWith('user-1', 'w1', false);
  });

  it('should ignore submit when keypad is disabled', async () => {
    mockDeutschService.buildSession.and.returnValue(Promise.resolve([
      makeWord({ wordId: 'w1', word: 'Hund' }),
    ]));
    createComponent();
    await flushMicrotasks();

    component.keypadDisabled.set(true);
    component.userAnswer.set('Hund');
    component.submitAnswer();

    expect(component.feedback()).toBeNull();
    expect(mockStatsService.recordResult).not.toHaveBeenCalled();
  });

  it('should advance to next word after correct answer', async () => {
    mockDeutschService.buildSession.and.returnValue(Promise.resolve([
      makeWord({ wordId: 'w1', word: 'Hund', listId: 'list-1', weight: 1 }),
      makeWord({ wordId: 'w2', word: 'Katze', listId: 'list-1', weight: 1 }),
    ]));
    createComponent();
    await flushMicrotasks();

    component.userAnswer.set('Hund');
    component.submitAnswer();

    // Manually call advance (what ExerciseStateService.handleResult does after setTimeout)
    // Private method access via bracket notation — works at runtime in Karma/ESBuild
    (component as unknown as { advance: () => void }).advance();

    expect(component.currentWord()?.wordId).toBe('w2');
  });

  it('should rebuild session when queue is exhausted', async () => {
    const queue = [
      makeWord({ wordId: 'w1', word: 'Hund', listId: 'list-1', weight: 1 }),
    ];
    mockDeutschService.buildSession.and.returnValues(
      Promise.resolve(queue),
      Promise.resolve([makeWord({ wordId: 'w3', word: 'Maus' })]),
    );
    createComponent();
    await flushMicrotasks();

    // Queue has 1 word. Answer it to exhaust the queue.
    component.userAnswer.set('Hund');
    component.submitAnswer();

    // Advance past the last word (triggers rebuild inside advance())
    (component as unknown as { advance: () => void }).advance();

    // buildSession should have been called twice (initial + rebuild)
    expect(mockDeutschService.buildSession).toHaveBeenCalledTimes(2);
    await flushMicrotasks();
    expect(component.currentWord()?.word).toBe('Maus');
  });

  it('should set sessionEmpty when rebuild returns empty', async () => {
    mockDeutschService.buildSession.and.returnValues(
      Promise.resolve([makeWord({ wordId: 'w1', word: 'Hund' })]),
      Promise.resolve([]),
    );
    createComponent();
    await flushMicrotasks();

    component.userAnswer.set('Hund');
    component.submitAnswer();
    (component as unknown as { advance: () => void }).advance();

    await flushMicrotasks();
    expect(component.sessionEmpty()).toBeTrue();
  });

  // ─── playWord ─────────────────────────────────────────────────────

  it('should not throw when playing word', async () => {
    mockDeutschService.buildSession.and.returnValue(Promise.resolve([
      makeWord({ wordId: 'w1', word: 'Hund' }),
    ]));
    createComponent();
    await flushMicrotasks();

    expect(() => component.playWord()).not.toThrow();
  });
});
