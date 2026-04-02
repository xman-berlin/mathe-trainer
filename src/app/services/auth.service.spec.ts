import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { DailyStreakService } from './daily-streak.service';
import { StatsService } from './stats.service';
import { CoinsService } from './coins.service';
import { BadgeService } from './badge.service';
import { AchievementsService } from './achievements.service';
import { TimedChallengeService } from './timed-challenge.service';
import { DeutschService } from './vocab.service';
import type { User } from '../models/user.model';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    username: 'testuser',
    avatar_style: 'adventurer',
    created_at: '2025-01-01T00:00:00Z',
    last_active_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let mockSupabase: jasmine.SpyObj<SupabaseService>;

  beforeEach(() => {
    mockSupabase = jasmine.createSpyObj('SupabaseService', [
      'getUser',
      'createUser',
      'getAllUsers',
      'updateLastActive',
    ]);

    // Mock localStorage
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');
    spyOn(localStorage, 'removeItem');

    // Mock child services that are lazy-loaded
    const mockDailyStreak = jasmine.createSpyObj('DailyStreakService', ['loadStreak', 'checkAndUpdateStreak', 'clearUserData']);
    const mockStats = jasmine.createSpyObj('StatsService', ['loadFromServer', 'clearUserData']);
    const mockCoins = jasmine.createSpyObj('CoinsService', ['loadBalance', 'reset']);
    const mockBadges = jasmine.createSpyObj('BadgeService', ['loadEarnedBadges', 'reset']);
    const mockAchievements = jasmine.createSpyObj('AchievementsService', ['loadFromServer', 'clearUserData']);
    const mockTimedChallenge = jasmine.createSpyObj('TimedChallengeService', ['loadFromServer', 'clearUserData']);
    const mockDeutsch = jasmine.createSpyObj('DeutschService', ['loadUserData', 'clearUserData']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: DailyStreakService, useValue: mockDailyStreak },
        { provide: StatsService, useValue: mockStats },
        { provide: CoinsService, useValue: mockCoins },
        { provide: BadgeService, useValue: mockBadges },
        { provide: AchievementsService, useValue: mockAchievements },
        { provide: TimedChallengeService, useValue: mockTimedChallenge },
        { provide: DeutschService, useValue: mockDeutsch },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  // ─── Initial State ──────────────────────────────────────────

  describe('initial state', () => {
    it('should start with no user', () => {
      expect(service.currentUser()).toBeNull();
    });

    it('should not be authenticated', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  // ─── login ──────────────────────────────────────────────────

  describe('login', () => {
    it('should set current user on successful login', async () => {
      const user = makeUser();
      mockSupabase.getUser.and.resolveTo(user);
      mockSupabase.updateLastActive.and.resolveTo();
      // Mock the lazy-loaded services
      const mockStreak = TestBed.inject(DailyStreakService) as jasmine.SpyObj<DailyStreakService>;
      mockStreak.loadStreak.and.resolveTo();
      mockStreak.checkAndUpdateStreak.and.resolveTo();
      const mockStats = TestBed.inject(StatsService) as jasmine.SpyObj<StatsService>;
      mockStats.loadFromServer.and.resolveTo();
      const mockCoins = TestBed.inject(CoinsService) as jasmine.SpyObj<CoinsService>;
      mockCoins.loadBalance.and.resolveTo();
      const mockBadges = TestBed.inject(BadgeService) as jasmine.SpyObj<BadgeService>;
      mockBadges.loadEarnedBadges.and.resolveTo();
      const mockAch = TestBed.inject(AchievementsService) as jasmine.SpyObj<AchievementsService>;
      mockAch.loadFromServer.and.resolveTo();
      const mockTimed = TestBed.inject(TimedChallengeService) as jasmine.SpyObj<TimedChallengeService>;
      mockTimed.loadFromServer.and.resolveTo();
      const mockDeutsch = TestBed.inject(DeutschService) as jasmine.SpyObj<DeutschService>;
      mockDeutsch.loadUserData.and.resolveTo();

      await service.login('testuser');
      expect(service.currentUser()?.username).toBe('testuser');
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should throw when user not found', async () => {
      mockSupabase.getUser.and.resolveTo(null);
      await expectAsync(service.login('unknown')).toBeRejected();
    });

    it('should update last active on login', async () => {
      const user = makeUser();
      mockSupabase.getUser.and.resolveTo(user);
      mockSupabase.updateLastActive.and.resolveTo();
      const mockStreak = TestBed.inject(DailyStreakService) as jasmine.SpyObj<DailyStreakService>;
      mockStreak.loadStreak.and.resolveTo();
      mockStreak.checkAndUpdateStreak.and.resolveTo();
      (TestBed.inject(StatsService) as jasmine.SpyObj<StatsService>).loadFromServer.and.resolveTo();
      (TestBed.inject(CoinsService) as jasmine.SpyObj<CoinsService>).loadBalance.and.resolveTo();
      (TestBed.inject(BadgeService) as jasmine.SpyObj<BadgeService>).loadEarnedBadges.and.resolveTo();
      (TestBed.inject(AchievementsService) as jasmine.SpyObj<AchievementsService>).loadFromServer.and.resolveTo();
      (TestBed.inject(TimedChallengeService) as jasmine.SpyObj<TimedChallengeService>).loadFromServer.and.resolveTo();
      (TestBed.inject(DeutschService) as jasmine.SpyObj<DeutschService>).loadUserData.and.resolveTo();

      await service.login('testuser');
      expect(mockSupabase.updateLastActive).toHaveBeenCalledWith('user-1');
    });
  });

  // ─── logout ─────────────────────────────────────────────────

  describe('logout', () => {
    it('should clear current user', async () => {
      // Set up a logged-in user
      service.currentUser.set(makeUser());

      await service.logout();
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should remove user from localStorage', async () => {
      service.currentUser.set(makeUser());
      await service.logout();
      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });

  // ─── getAllUsers ─────────────────────────────────────────────

  describe('getAllUsers', () => {
    it('should return users from supabase', async () => {
      const users = [makeUser(), makeUser({ id: 'user-2', username: 'other' })];
      mockSupabase.getAllUsers.and.resolveTo(users);
      const result = await service.getAllUsers();
      expect(result.length).toBe(2);
    });

    it('should return empty array on error', async () => {
      mockSupabase.getAllUsers.and.rejectWith(new Error('network'));
      const result = await service.getAllUsers();
      expect(result).toEqual([]);
    });
  });

  // ─── updateLastActive ───────────────────────────────────────

  describe('updateLastActive', () => {
    it('should update when user is logged in', async () => {
      service.currentUser.set(makeUser());
      mockSupabase.updateLastActive.and.resolveTo();
      await service.updateLastActive();
      expect(mockSupabase.updateLastActive).toHaveBeenCalledWith('user-1');
    });

    it('should not throw when no user', async () => {
      await expectAsync(service.updateLastActive()).not.toBeRejected();
    });
  });

  // ─── createUser ─────────────────────────────────────────────

  describe('createUser', () => {
    it('should create and auto-login user', async () => {
      const user = makeUser({ username: 'newuser' });
      mockSupabase.createUser.and.resolveTo(user);
      mockSupabase.updateLastActive.and.resolveTo();
      const mockStreak = TestBed.inject(DailyStreakService) as jasmine.SpyObj<DailyStreakService>;
      mockStreak.loadStreak.and.resolveTo();
      mockStreak.checkAndUpdateStreak.and.resolveTo();
      (TestBed.inject(StatsService) as jasmine.SpyObj<StatsService>).loadFromServer.and.resolveTo();
      (TestBed.inject(CoinsService) as jasmine.SpyObj<CoinsService>).loadBalance.and.resolveTo();
      (TestBed.inject(BadgeService) as jasmine.SpyObj<BadgeService>).loadEarnedBadges.and.resolveTo();
      (TestBed.inject(AchievementsService) as jasmine.SpyObj<AchievementsService>).loadFromServer.and.resolveTo();
      (TestBed.inject(TimedChallengeService) as jasmine.SpyObj<TimedChallengeService>).loadFromServer.and.resolveTo();
      (TestBed.inject(DeutschService) as jasmine.SpyObj<DeutschService>).loadUserData.and.resolveTo();

      const result = await service.createUser({ username: 'newuser', avatar_style: 'adventurer' });
      expect(result.username).toBe('newuser');
      expect(service.currentUser()?.username).toBe('newuser');
    });

    it('should throw on error', async () => {
      mockSupabase.createUser.and.rejectWith(new Error('duplicate'));
      await expectAsync(
        service.createUser({ username: 'dup', avatar_style: 'adventurer' })
      ).toBeRejected();
    });
  });
});
