import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StreakDisplayComponent } from './streak-display.component';
import { DailyStreakService } from '../../services/daily-streak.service';
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

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: DailyStreakService, useValue: mockStreakService },
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

  it('should show milestone badges when streak > 0', () => {
    currentStreakSignal.set(3);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const badges = el.querySelectorAll('.milestone-badge');
    expect(badges.length).toBe(STREAK_MILESTONES.length);
  });

  it('should mark achieved milestones', () => {
    currentStreakSignal.set(10);
    achievedMilestonesSignal.set([7]);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const achievedBadges = el.querySelectorAll('.milestone-badge.achieved');
    expect(achievedBadges.length).toBe(1);
  });

  it('should return correct milestone emoji', () => {
    expect(component.getMilestoneEmoji(7)).toBe('🥉');
    expect(component.getMilestoneEmoji(14)).toBe('🥈');
    expect(component.getMilestoneEmoji(30)).toBe('🎖️');
    expect(component.getMilestoneEmoji(50)).toBe('⭐');
    expect(component.getMilestoneEmoji(100)).toBe('🏆');
    expect(component.getMilestoneEmoji(365)).toBe('👑');
  });
});
