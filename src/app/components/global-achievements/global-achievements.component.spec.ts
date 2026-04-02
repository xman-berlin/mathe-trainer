import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GlobalAchievementsComponent } from './global-achievements.component';
import { CoinsService } from '../../services/coins.service';
import { GameService } from '../../services/game.service';
import { AchievementsService } from '../../services/achievements.service';
import { TimedChallengeService } from '../../services/timed-challenge.service';
import { StatsService } from '../../services/stats.service';
import { BadgeService } from '../../services/badge.service';
import { AuthService } from '../../services/auth.service';
import { DailyStreakService } from '../../services/daily-streak.service';
import { SupabaseService } from '../../services/supabase.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GlobalAchievementsComponent', () => {
  let component: GlobalAchievementsComponent;
  let fixture: ComponentFixture<GlobalAchievementsComponent>;

  const mockCoinsService = {
    balance: signal(100).asReadonly(),
  };

  const mockGameService = {
    canAffordGame: jasmine.createSpy('canAffordGame').and.returnValue(true),
    getHighScore: jasmine.createSpy('getHighScore').and.returnValue(0),
    getTimesPlayed: jasmine.createSpy('getTimesPlayed').and.returnValue(0),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: CoinsService, useValue: mockCoinsService },
        { provide: GameService, useValue: mockGameService },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            data: of({}),
            snapshot: { data: {} },
          },
        },
        {
          provide: AchievementsService,
          useValue: {
            totalMastered: signal(0).asReadonly(),
            getMastery: jasmine.createSpy('getMastery').and.returnValue({ mastered: false, currentStreak: 0 }),
          },
        },
        {
          provide: TimedChallengeService,
          useValue: { getBestForTypes: jasmine.createSpy('getBestForTypes').and.returnValue(null) },
        },
        {
          provide: StatsService,
          useValue: {
            lifetimeStatsByType: signal({}).asReadonly(),
            statsByType: signal({}).asReadonly(),
            bestStreaksByType: signal({}).asReadonly(),
            getMedalLevel: jasmine.createSpy('getMedalLevel').and.returnValue('none'),
            getProgressToNextMedal: jasmine.createSpy('getProgressToNextMedal').and.returnValue({ current: 0, target: 100, percent: 0 }),
          },
        },
        {
          provide: BadgeService,
          useValue: { getAllBadgesWithProgress: jasmine.createSpy('getAllBadgesWithProgress').and.returnValue([]) },
        },
        {
          provide: AuthService,
          useValue: { currentUser: signal(null) },
        },
        {
          provide: DailyStreakService,
          useValue: { currentStreak: signal(0).asReadonly() },
        },
        {
          provide: SupabaseService,
          useValue: {
            getMastery: jasmine.createSpy('getMastery').and.returnValue(Promise.resolve([])),
            getPersonalBests: jasmine.createSpy('getPersonalBests').and.returnValue(Promise.resolve([])),
            getDailyStreak: jasmine.createSpy('getDailyStreak').and.returnValue(Promise.resolve({ current_streak: 0, longest_streak: 0 })),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(GlobalAchievementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to math tab', () => {
    expect(component.activeTab()).toBe('math');
  });

  it('should have available games', () => {
    expect(component.games.length).toBeGreaterThan(0);
  });

  it('should switch tab', () => {
    component.switchTab('clock');
    expect(component.activeTab()).toBe('clock');

    component.switchTab('badges');
    expect(component.activeTab()).toBe('badges');

    component.switchTab('games');
    expect(component.activeTab()).toBe('games');
  });

  it('should validate tabs', () => {
    expect(component.isValidTab('math')).toBeTrue();
    expect(component.isValidTab('clock')).toBeTrue();
    expect(component.isValidTab('badges')).toBeTrue();
    expect(component.isValidTab('games')).toBeTrue();
    expect(component.isValidTab('invalid')).toBeFalse();
  });

  it('should return correct tab labels', () => {
    expect(component.getTabLabel('math')).toBe('Mathe');
    expect(component.getTabLabel('clock')).toBe('Uhrzeit');
    expect(component.getTabLabel('badges')).toBe('Badges');
    expect(component.getTabLabel('games')).toBe('Spiele');
  });

  it('should return correct tab icons', () => {
    expect(component.getTabIcon('math')).toBe('📐');
    expect(component.getTabIcon('clock')).toBe('🕐');
    expect(component.getTabIcon('badges')).toBe('🏅');
    expect(component.getTabIcon('games')).toBe('🎮');
  });

  it('should check if can afford game', () => {
    expect(component.canAffordGame('some-game')).toBeTrue();
    expect(mockGameService.canAffordGame).toHaveBeenCalledWith('some-game');
  });
});
