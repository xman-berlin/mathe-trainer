import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AchievementsComponent } from './achievements.component';
import { AchievementsService } from '../../services/achievements.service';
import { TimedChallengeService } from '../../services/timed-challenge.service';
import { StatsService } from '../../services/stats.service';

describe('AchievementsComponent', () => {
  let component: AchievementsComponent;
  let fixture: ComponentFixture<AchievementsComponent>;

  const mockAchievementsService = {
    totalMastered: signal(0).asReadonly(),
    getMastery: jasmine.createSpy('getMastery').and.returnValue({ mastered: false, currentStreak: 0 }),
  };

  const mockTimedChallengeService = {
    getBestForTypes: jasmine.createSpy('getBestForTypes').and.returnValue(null),
  };

  const mockStatsService = {
    getMedalLevel: jasmine.createSpy('getMedalLevel').and.returnValue('none'),
    getProgressToNextMedal: jasmine.createSpy('getProgressToNextMedal').and.returnValue({ current: 0, target: 100, percent: 0 }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AchievementsService, useValue: mockAchievementsService },
        { provide: TimedChallengeService, useValue: mockTimedChallengeService },
        { provide: StatsService, useValue: mockStatsService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: {} },
            queryParams: of({}),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(AchievementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to math category', () => {
    expect(component.categorySignal()).toBe('math');
  });

  it('should compute title for math', () => {
    component.categorySignal.set('math');
    expect(component.title()).toBe('🏆 Mathe-Erfolge');
  });

  it('should compute title for clock', () => {
    component.categorySignal.set('clock');
    expect(component.title()).toBe('🏆 Uhrzeit-Erfolge');
  });

  it('should have 10 reihen', () => {
    expect(component.reihen).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('should have exercise types', () => {
    expect(component.exerciseTypes.length).toBe(5);
    expect(component.exerciseTypes.map(t => t.key)).toContain('addition');
    expect(component.exerciseTypes.map(t => t.key)).toContain('word-problems');
  });

  it('should have clock exercise types', () => {
    expect(component.clockExerciseTypes.length).toBe(13);
    expect(component.clockExerciseTypes.map(t => t.key)).toContain('clock-full');
    expect(component.clockExerciseTypes.map(t => t.key)).toContain('clock-setClock-fiveMinAfter');
    expect(component.clockExerciseTypes.map(t => t.key)).toContain('clock-zeitspanne');
    expect(component.clockExerciseTypes.map(t => t.key)).toContain('clock-verspaetung');
  });

  it('should return progress text', () => {
    mockAchievementsService.getMastery.and.returnValue({ mastered: true, currentStreak: 10 });
    expect(component.getProgressText(1)).toBe('✓');

    mockAchievementsService.getMastery.and.returnValue({ mastered: false, currentStreak: 5 });
    expect(component.getProgressText(1)).toBe('5/10');
  });

  it('should check mastery', () => {
    mockAchievementsService.getMastery.and.returnValue({ mastered: true, currentStreak: 10 });
    expect(component.isMastered(1)).toBeTrue();

    mockAchievementsService.getMastery.and.returnValue({ mastered: false, currentStreak: 3 });
    expect(component.isMastered(1)).toBeFalse();
  });

  it('should return medal emoji', () => {
    mockStatsService.getMedalLevel.and.returnValue('gold');
    expect(component.getMedalEmoji('addition')).toBe('🥇');

    mockStatsService.getMedalLevel.and.returnValue('silver');
    expect(component.getMedalEmoji('addition')).toBe('🥈');

    mockStatsService.getMedalLevel.and.returnValue('bronze');
    expect(component.getMedalEmoji('addition')).toBe('🥉');

    mockStatsService.getMedalLevel.and.returnValue('none');
    expect(component.getMedalEmoji('addition')).toBe('⭕');
  });

  it('should return medal label', () => {
    mockStatsService.getMedalLevel.and.returnValue('gold');
    expect(component.getMedalLabel('addition')).toBe('Gold');

    mockStatsService.getMedalLevel.and.returnValue('none');
    expect(component.getMedalLabel('addition')).toBe('Noch keine Medaille');
  });

  it('should return next medal label', () => {
    mockStatsService.getProgressToNextMedal.and.returnValue({ current: 1000, target: 1000, percent: 100 });
    expect(component.getNextMedalLabel('addition')).toBe('Gold erreicht!');

    mockStatsService.getProgressToNextMedal.and.returnValue({ current: 500, target: 1000, percent: 50 });
    expect(component.getNextMedalLabel('addition')).toBe('bis Gold');

    mockStatsService.getProgressToNextMedal.and.returnValue({ current: 100, target: 500, percent: 20 });
    expect(component.getNextMedalLabel('addition')).toBe('bis Silber');

    mockStatsService.getProgressToNextMedal.and.returnValue({ current: 50, target: 100, percent: 50 });
    expect(component.getNextMedalLabel('addition')).toBe('bis Bronze');
  });

  it('should return back link based on category', () => {
    component.categorySignal.set('math');
    expect(component.getBackLink()).toBe('/mathe');

    component.categorySignal.set('clock');
    expect(component.getBackLink()).toBe('/uhrzeit');
  });
});
