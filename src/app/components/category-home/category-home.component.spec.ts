import { computed, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CategoryHomeComponent } from './category-home';
import { StatsService } from '../../services/stats.service';
import { CoinsService } from '../../services/coins.service';
import { DailyStreakService } from '../../services/daily-streak.service';
import { STREAK_MILESTONES } from '../../models/daily-streak.model';
import { PracticeCategory } from '../../models/practice-exercise.catalog';

describe('CategoryHomeComponent', () => {
  let component: CategoryHomeComponent;
  let fixture: ComponentFixture<CategoryHomeComponent>;
  let byTypeSignal: ReturnType<
    typeof signal<Record<string, { correct: number; incorrect: number }>>
  >;
  let isGoalReachedSignal: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    byTypeSignal = signal<Record<string, { correct: number; incorrect: number }>>({});
    isGoalReachedSignal = signal(false);

    const mockStats = {
      statsByType: byTypeSignal.asReadonly(),
      mathCorrectCount: computed(() => {
        const types = byTypeSignal();
        return ['addition', 'subtraction', 'multiplication', 'division', 'word-problems'].reduce(
          (s, k) => s + (types[k]?.correct ?? 0),
          0
        );
      }),
      mathIncorrectCount: computed(() => {
        const types = byTypeSignal();
        return ['addition', 'subtraction', 'multiplication', 'division', 'word-problems'].reduce(
          (s, k) => s + (types[k]?.incorrect ?? 0),
          0
        );
      }),
      clockCorrectCount: computed(() => {
        const types = byTypeSignal();
        return Object.entries(types)
          .filter(([k]) => k.startsWith('clock-'))
          .reduce((s, [, v]) => s + (v.correct ?? 0), 0);
      }),
      clockIncorrectCount: computed(() => {
        const types = byTypeSignal();
        return Object.entries(types)
          .filter(([k]) => k.startsWith('clock-'))
          .reduce((s, [, v]) => s + (v.incorrect ?? 0), 0);
      }),
      deutschCorrectCount: computed(() => {
        const types = byTypeSignal();
        return Object.entries(types)
          .filter(([k]) => k.startsWith('deutsch-'))
          .reduce((s, [, v]) => s + (v.correct ?? 0), 0);
      }),
      deutschIncorrectCount: computed(() => {
        const types = byTypeSignal();
        return Object.entries(types)
          .filter(([k]) => k.startsWith('deutsch-'))
          .reduce((s, [, v]) => s + (v.incorrect ?? 0), 0);
      }),
      englischCorrectCount: computed(() => {
        const types = byTypeSignal();
        return Object.entries(types)
          .filter(([k]) => k.startsWith('englisch-'))
          .reduce((s, [, v]) => s + (v.correct ?? 0), 0);
      }),
      englischIncorrectCount: computed(() => {
        const types = byTypeSignal();
        return Object.entries(types)
          .filter(([k]) => k.startsWith('englisch-'))
          .reduce((s, [, v]) => s + (v.incorrect ?? 0), 0);
      }),
      goalProgressPercent: signal(0).asReadonly(),
      isGoalReached: isGoalReachedSignal.asReadonly(),
      clockGoalProgressPercent: signal(0).asReadonly(),
      isClockGoalReached: signal(false).asReadonly(),
      deutschGoalProgressPercent: signal(0).asReadonly(),
      isDeutschGoalReached: signal(false).asReadonly(),
      englischGoalProgressPercent: signal(0).asReadonly(),
      isEnglischGoalReached: signal(false).asReadonly(),
      categoryCorrectSum: (_cat: PracticeCategory) => 0,
      categoryGoalSum: (cat: PracticeCategory) => {
        if (cat === 'math') return 20;
        if (cat === 'clock') return 20;
        if (cat === 'deutsch') return 25;
        return 20;
      },
    };

    const mockStreakService = {
      currentStreak: signal(0).asReadonly(),
      longestStreak: signal(0).asReadonly(),
      achievedMilestones: signal<number[]>([]).asReadonly(),
      MILESTONES: STREAK_MILESTONES,
      getNextMilestone: () => null,
      getDaysToNextMilestone: () => 0,
      isAtMilestone: () => false,
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: StatsService, useValue: mockStats },
        { provide: CoinsService, useValue: { balance: signal(42).asReadonly() } },
        { provide: DailyStreakService, useValue: mockStreakService },
      ],
    });

    fixture = TestBed.createComponent(CategoryHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display hero text', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Schlaufuchs');
  });

  it('should show four practice category cards including Englisch', () => {
    const el: HTMLElement = fixture.nativeElement;
    const cards = el.querySelectorAll('.category-card');
    expect(cards.length).toBe(4);
    expect(el.textContent).toContain('Englisch');
    expect(el.textContent).not.toContain('Badges, Medaillen');
  });

  it('should display coin balance on streak card', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('42');
    expect(el.querySelector('a.streak-display')).toBeTruthy();
  });

  it('should aggregate math incorrect count', () => {
    byTypeSignal.set({
      addition: { correct: 3, incorrect: 2 },
      subtraction: { correct: 2, incorrect: 1 },
      multiplication: { correct: 1, incorrect: 3 },
      division: { correct: 0, incorrect: 1 },
    });
    fixture.detectChanges();
    expect(component.mathIncorrectCount()).toBe(7);
  });

  it('should aggregate clock incorrect count', () => {
    byTypeSignal.set({
      'clock-full': { correct: 2, incorrect: 1 },
      'clock-half': { correct: 1, incorrect: 2 },
      'clock-quarter': { correct: 3, incorrect: 0 },
    });
    fixture.detectChanges();
    expect(component.clockIncorrectCount()).toBe(3);
  });

  it('should count new vor/nach types in clockCorrectCount', () => {
    byTypeSignal.set({
      'clock-setClock-fiveMinAfter': { correct: 5, incorrect: 1 },
      'clock-setClock-fiveMinBefore': { correct: 3, incorrect: 0 },
      'clock-setClock-fiveMinHalf': { correct: 2, incorrect: 1 },
    });
    fixture.detectChanges();
    expect(component.clockCorrectCount()).toBe(10);
    expect(component.clockIncorrectCount()).toBe(2);
  });

  it('should count Zeitspannen and Verspätung in clockCorrectCount', () => {
    byTypeSignal.set({
      'clock-zeitspanne': { correct: 4, incorrect: 1 },
      'clock-verspaetung': { correct: 3, incorrect: 2 },
    });
    fixture.detectChanges();
    expect(component.clockCorrectCount()).toBe(7);
    expect(component.clockIncorrectCount()).toBe(3);
  });

  it('should aggregate deutsch incorrect count across all types', () => {
    byTypeSignal.set({
      'deutsch-rechtschreibung': { correct: 5, incorrect: 3 },
      'deutsch-hangman': { correct: 2, incorrect: 1 },
    });
    fixture.detectChanges();
    expect(component.deutschIncorrectCount()).toBe(4);
  });

  it('should aggregate englisch incorrect count', () => {
    byTypeSignal.set({
      'englisch-uebersetzung': { correct: 4, incorrect: 2 },
    });
    fixture.detectChanges();
    expect(component.englischIncorrectCount()).toBe(2);
  });

  it('should show Geschafft when math goal reached', () => {
    isGoalReachedSignal.set(true);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Geschafft!');
    expect(el.querySelector('.category-card--goal-done')).toBeTruthy();
  });
});
