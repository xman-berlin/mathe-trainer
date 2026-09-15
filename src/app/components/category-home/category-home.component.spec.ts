import { provideZonelessChangeDetection, signal, Signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CategoryHomeComponent } from './category-home';
import { StatsService } from '../../services/stats.service';
import { CoinsService } from '../../services/coins.service';
import { PracticePlanService } from '../../services/practice-plan.service';
import { DailyStreakService } from '../../services/daily-streak.service';
import { STREAK_MILESTONES } from '../../models/daily-streak.model';

interface MockStatsService {
  statsByType: Signal<Record<string, { correct: number; incorrect: number }>>;
  currentGoal: Signal<number>;
  currentClockGoal: Signal<number>;
  currentDeutschGoal: Signal<number>;
  currentEnglischGoal: Signal<number>;
  mathCorrectCount: Signal<number>;
  goalProgressPercent: Signal<number>;
  isGoalReached: Signal<boolean>;
  clockCorrectCount: Signal<number>;
  clockGoalProgressPercent: Signal<number>;
  isClockGoalReached: Signal<boolean>;
  deutschCorrectCount: Signal<number>;
  deutschGoalProgressPercent: Signal<number>;
  isDeutschGoalReached: Signal<boolean>;
  englischCorrectCount: Signal<number>;
  englischGoalProgressPercent: Signal<number>;
  isEnglischGoalReached: Signal<boolean>;
  setDailyGoal: jasmine.Spy;
  setClockDailyGoal: jasmine.Spy;
  setDeutschDailyGoal: jasmine.Spy;
}

describe('CategoryHomeComponent', () => {
  let component: CategoryHomeComponent;
  let fixture: ComponentFixture<CategoryHomeComponent>;
  let mockStatsService: MockStatsService;
  let byTypeSignal: ReturnType<typeof signal<Record<string, { correct: number; incorrect: number }>>>;

  beforeEach(() => {
    byTypeSignal = signal<Record<string, { correct: number; incorrect: number }>>({});
    const dailyGoalSignal = signal(20);
    const clockGoalSignal = signal(20);
    const deutschGoalSignal = signal(10);
    const englischGoalSignal = signal(10);

    mockStatsService = {
      statsByType: byTypeSignal.asReadonly(),
      currentGoal: dailyGoalSignal.asReadonly(),
      currentClockGoal: clockGoalSignal.asReadonly(),
      currentDeutschGoal: deutschGoalSignal.asReadonly(),
      currentEnglischGoal: englischGoalSignal.asReadonly(),
      mathCorrectCount: signal(0).asReadonly(),
      goalProgressPercent: signal(0).asReadonly(),
      isGoalReached: signal(false).asReadonly(),
      clockCorrectCount: signal(0).asReadonly(),
      clockGoalProgressPercent: signal(0).asReadonly(),
      isClockGoalReached: signal(false).asReadonly(),
      deutschCorrectCount: signal(0).asReadonly(),
      deutschGoalProgressPercent: signal(0).asReadonly(),
      isDeutschGoalReached: signal(false).asReadonly(),
      englischCorrectCount: signal(0).asReadonly(),
      englischGoalProgressPercent: signal(0).asReadonly(),
      isEnglischGoalReached: signal(false).asReadonly(),
      setDailyGoal: jasmine.createSpy('setDailyGoal'),
      setClockDailyGoal: jasmine.createSpy('setClockDailyGoal'),
      setDeutschDailyGoal: jasmine.createSpy('setDeutschDailyGoal'),
    };

    const mockPracticePlan = {
      isActive: signal(false).asReadonly(),
      progressLabel: signal('').asReadonly(),
      startFromDailyGoals: jasmine.createSpy('startFromDailyGoals'),
      resume: jasmine.createSpy('resume'),
      cancel: jasmine.createSpy('cancel'),
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
        { provide: StatsService, useValue: mockStatsService },
        { provide: CoinsService, useValue: { balance: signal(42).asReadonly() } },
        { provide: PracticePlanService, useValue: mockPracticePlan },
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

  it('should call setDailyGoal on saveGoal', () => {
    component.editGoalValue = 30;
    component.saveGoal();
    expect(mockStatsService.setDailyGoal).toHaveBeenCalledWith(30);
  });

  it('should toggle goal editor visibility', () => {
    expect(component.showGoalEditor()).toBeFalse();
    component.editGoal();
    expect(component.showGoalEditor()).toBeTrue();
    component.cancelGoalEdit();
    expect(component.showGoalEditor()).toBeFalse();
  });

  it('should return correct exercise labels', () => {
    expect(component.getExerciseLabel('addition')).toContain('Addition');
    expect(component.getExerciseLabel('subtraction')).toContain('Subtraktion');
    expect(component.getExerciseLabel('multiplication')).toContain('Multiplikation');
    expect(component.getExerciseLabel('division')).toContain('Division');
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
});
