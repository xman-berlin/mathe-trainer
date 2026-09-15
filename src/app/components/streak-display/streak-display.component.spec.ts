import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StreakDisplayComponent } from './streak-display.component';
import { DailyStreakService } from '../../services/daily-streak.service';
import { CoinsService } from '../../services/coins.service';
import { STREAK_MILESTONES } from '../../models/daily-streak.model';

describe('StreakDisplayComponent', () => {
  let component: StreakDisplayComponent;
  let fixture: ComponentFixture<StreakDisplayComponent>;
  let currentStreakSignal: ReturnType<typeof signal<number>>;
  let longestStreakSignal: ReturnType<typeof signal<number>>;
  let achievedMilestonesSignal: ReturnType<typeof signal<number[]>>;

  beforeEach(() => {
    currentStreakSignal = signal(0);
    longestStreakSignal = signal(0);
    achievedMilestonesSignal = signal<number[]>([]);

    const mockStreakService = {
      currentStreak: currentStreakSignal.asReadonly(),
      longestStreak: longestStreakSignal.asReadonly(),
      achievedMilestones: achievedMilestonesSignal.asReadonly(),
      MILESTONES: STREAK_MILESTONES,
      getNextMilestone: jasmine.createSpy('getNextMilestone').and.returnValue(7),
      getDaysToNextMilestone: jasmine.createSpy('getDaysToNextMilestone').and.returnValue(7),
      isAtMilestone: jasmine.createSpy('isAtMilestone').and.returnValue(false),
    };

    const mockCoinsService = {
      balance: signal(42).asReadonly(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: DailyStreakService, useValue: mockStreakService },
        { provide: CoinsService, useValue: mockCoinsService },
      ],
    });

    fixture = TestBed.createComponent(StreakDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display "Keine Streak" when streak is 0', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Keine Streak');
  });

  it('should display streak count when streak > 0', () => {
    currentStreakSignal.set(5);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('5');
    expect(el.textContent).toContain('Tage');
  });

  it('should show compact next-milestone hint when streak > 0', () => {
    currentStreakSignal.set(3);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('→ 7');
    expect(el.querySelector('.progress-bar')).toBeTruthy();
  });

  it('should return correct milestone emoji', () => {
    expect(component.getMilestoneEmoji(7)).toBe('🥉');
    expect(component.getMilestoneEmoji(14)).toBe('🥈');
    expect(component.getMilestoneEmoji(30)).toBe('🎖️');
    expect(component.getMilestoneEmoji(50)).toBe('⭐');
    expect(component.getMilestoneEmoji(100)).toBe('🏆');
    expect(component.getMilestoneEmoji(365)).toBe('👑');
  });

  it('should link to Erfolge and show coins', () => {
    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector('a.streak-display') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/erfolge');
    expect(el.textContent).toContain('42');
    expect(el.textContent).toContain('Erfolge');
  });

  it('should not render milestone badge gallery', () => {
    currentStreakSignal.set(3);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.milestone-badge').length).toBe(0);
  });
});
