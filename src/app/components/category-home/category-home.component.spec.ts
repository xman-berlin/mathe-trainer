import { provideZonelessChangeDetection, signal, Signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CategoryHomeComponent } from './category-home';
import { StatsService } from '../../services/stats.service';
import { CoinsService } from '../../services/coins.service';

interface MockStatsService {
  statsByType: Signal<Record<string, { correct: number; incorrect: number }>>;
  currentGoal: Signal<number>;
  currentClockGoal: Signal<number>;
  currentDeutschGoal: Signal<number>;
  mathCorrectCount: Signal<number>;
  goalProgressPercent: Signal<number>;
  isGoalReached: Signal<boolean>;
  clockCorrectCount: Signal<number>;
  clockGoalProgressPercent: Signal<number>;
  isClockGoalReached: Signal<boolean>;
  deutschCorrectCount: Signal<number>;
  deutschGoalProgressPercent: Signal<number>;
  isDeutschGoalReached: Signal<boolean>;
  setDailyGoal: jasmine.Spy;
  setClockDailyGoal: jasmine.Spy;
  setDeutschDailyGoal: jasmine.Spy;
}

interface MockCoinsService {
  balance: Signal<number>;
}

describe('CategoryHomeComponent', () => {
  let component: CategoryHomeComponent;
  let fixture: ComponentFixture<CategoryHomeComponent>;
  let mockStatsService: MockStatsService;
  let mockCoinsService: MockCoinsService;
  let byTypeSignal: ReturnType<typeof signal<Record<string, { correct: number; incorrect: number }>>>;

  beforeEach(() => {
    byTypeSignal = signal<Record<string, { correct: number; incorrect: number }>>({});
    const dailyGoalSignal = signal(20);
    const clockGoalSignal = signal(20);
    const deutschGoalSignal = signal(10);

    mockStatsService = {
      statsByType: byTypeSignal.asReadonly(),
      currentGoal: dailyGoalSignal.asReadonly(),
      currentClockGoal: clockGoalSignal.asReadonly(),
      currentDeutschGoal: deutschGoalSignal.asReadonly(),
      mathCorrectCount: signal(0).asReadonly(),
      goalProgressPercent: signal(0).asReadonly(),
      isGoalReached: signal(false).asReadonly(),
      clockCorrectCount: signal(0).asReadonly(),
      clockGoalProgressPercent: signal(0).asReadonly(),
      isClockGoalReached: signal(false).asReadonly(),
      deutschCorrectCount: signal(0).asReadonly(),
      deutschGoalProgressPercent: signal(0).asReadonly(),
      isDeutschGoalReached: signal(false).asReadonly(),
      setDailyGoal: jasmine.createSpy('setDailyGoal'),
      setClockDailyGoal: jasmine.createSpy('setClockDailyGoal'),
      setDeutschDailyGoal: jasmine.createSpy('setDeutschDailyGoal'),
    };

    mockCoinsService = {
      balance: signal(42).asReadonly(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: StatsService, useValue: mockStatsService },
        { provide: CoinsService, useValue: mockCoinsService },
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

  it('should show category cards', () => {
    const el: HTMLElement = fixture.nativeElement;
    const cards = el.querySelectorAll('.category-card');
    expect(cards.length).toBe(4);
  });

  it('should display coin balance', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('42');
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
      'addition': { correct: 3, incorrect: 2 },
      'subtraction': { correct: 2, incorrect: 1 },
      'multiplication': { correct: 1, incorrect: 3 },
      'division': { correct: 0, incorrect: 1 }
    });
    fixture.detectChanges();
    expect(component.mathIncorrectCount()).toBe(7);
  });

  it('should aggregate clock incorrect count', () => {
    byTypeSignal.set({
      'clock-full': { correct: 2, incorrect: 1 },
      'clock-half': { correct: 1, incorrect: 2 },
      'clock-quarter': { correct: 3, incorrect: 0 }
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

  it('should aggregate deutsch incorrect count across all types', () => {
    byTypeSignal.set({
      'deutsch-rechtschreibung': { correct: 5, incorrect: 3 },
      'deutsch-hangman': { correct: 2, incorrect: 1 }
    });
    fixture.detectChanges();
    expect(component.deutschIncorrectCount()).toBe(4);
  });
});
