import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BadgeDisplayComponent } from './badge-display.component';
import { BadgeService } from '../../services/badge.service';
import type { BadgeProgress } from '../../models/badge.model';
import { StatsService } from '../../services/stats.service';
import { AuthService } from '../../services/auth.service';
import { DailyStreakService } from '../../services/daily-streak.service';
import { SupabaseService } from '../../services/supabase.service';

describe('BadgeDisplayComponent', () => {
  let component: BadgeDisplayComponent;
  let fixture: ComponentFixture<BadgeDisplayComponent>;

  const mockBadgeService = {
    getAllBadgesWithProgress: jasmine.createSpy('getAllBadgesWithProgress').and.returnValue([]),
  };

  const mockStatsService = {
    lifetimeStatsByType: signal({}).asReadonly(),
    statsByType: signal({}).asReadonly(),
    bestStreaksByType: signal({}).asReadonly(),
  };

  const mockAuthService = {
    currentUser: signal(null),
  };

  const mockStreakService = {
    currentStreak: signal(0).asReadonly(),
  };

  const mockSupabaseService = {
    getMastery: jasmine.createSpy('getMastery').and.returnValue(Promise.resolve([])),
    getPersonalBests: jasmine.createSpy('getPersonalBests').and.returnValue(Promise.resolve([])),
    getDailyStreak: jasmine.createSpy('getDailyStreak').and.returnValue(Promise.resolve({ current_streak: 0, longest_streak: 0 })),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: BadgeService, useValue: mockBadgeService },
        { provide: StatsService, useValue: mockStatsService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DailyStreakService, useValue: mockStreakService },
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    });

    fixture = TestBed.createComponent(BadgeDisplayComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should initialize with loading true', () => {
    expect(component.isLoading()).toBeTrue();
  });

  it('should compute category title', () => {
    expect(component.getCategoryTitle('performance')).toBe('Leistung');
    expect(component.getCategoryTitle('consistency')).toBe('Beständigkeit');
    expect(component.getCategoryTitle('milestone')).toBe('Meilensteine');
    expect(component.getCategoryTitle('challenge')).toBe('Herausforderungen');
  });

  it('should compute category icon', () => {
    expect(component.getCategoryIcon('performance')).toBe('⚡');
    expect(component.getCategoryIcon('consistency')).toBe('🔥');
    expect(component.getCategoryIcon('milestone')).toBe('🏆');
    expect(component.getCategoryIcon('challenge')).toBe('🎯');
  });

  it('should format date', () => {
    const result = component.formatDate('2025-01-15');
    expect(result).toContain('2025');
  });

  it('should return empty string for undefined date', () => {
    expect(component.formatDate(undefined)).toBe('');
  });

  it('should compute badge counts', () => {
    component.badgesWithProgress.set([
      { badge: { id: '1', name: 'Test', category: 'performance', coinReward: 10 }, earned: true, progress: 100 } as unknown as BadgeProgress,
      { badge: { id: '2', name: 'Test2', category: 'consistency', coinReward: 20 }, earned: false, progress: 50 } as unknown as BadgeProgress,
    ]);
    expect(component.totalBadges()).toBe(2);
    expect(component.earnedBadges()).toBe(1);
    expect(component.totalCoinsFromBadges()).toBe(10);
  });

  it('should filter badges by category', () => {
    component.badgesWithProgress.set([
      { badge: { id: '1', name: 'Perf', category: 'performance', coinReward: 10 }, earned: true, progress: 100 } as unknown as BadgeProgress,
      { badge: { id: '2', name: 'Cons', category: 'consistency', coinReward: 20 }, earned: false, progress: 50 } as unknown as BadgeProgress,
    ]);
    expect(component.performanceBadges().length).toBe(1);
    expect(component.consistencyBadges().length).toBe(1);
    expect(component.milestoneBadges().length).toBe(0);
    expect(component.challengeBadges().length).toBe(0);
  });
});
