import { Injectable, signal, computed, inject, Injector } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { User, CreateUserData } from '../models/user.model';

const CURRENT_USER_KEY = 'schlaufuchs-current-user';

/**
 * Authentication service for managing user sessions
 * Uses Angular signals for reactive state management
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Signals
  currentUser = signal<User | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null);

  private injector = inject(Injector);
  private supabase = inject(SupabaseService);

  constructor() {
    // Load user from localStorage on initialization
    this.loadUserFromStorage();
  }

  /**
   * Login with existing username
   */
  async login(username: string): Promise<void> {
    try {
      const user = await this.supabase.getUser(username);

      if (!user) {
        throw new Error(`User '${username}' not found`);
      }

      // Update last active timestamp
      await this.supabase.updateLastActive(user.id);

      // Update state and persist
      this.currentUser.set(user);
      this.saveUserToStorage(user);

      // Load streak data for this user
      await this.loadUserData(user.id);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {

    // Clear data from all services
    await this.clearAllUserData();

    // Clear current user
    this.currentUser.set(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  /**
   * Clear data from all services
   */
  private async clearAllUserData(): Promise<void> {
    try {
      // Import and clear each service using injector
      const { StatsService } = await import('./stats.service');
      const statsService = this.injector.get(StatsService);
      statsService.clearUserData();

      const { AchievementsService } = await import('./achievements.service');
      const achievementsService = this.injector.get(AchievementsService);
      achievementsService.clearUserData();

      const { TimedChallengeService } = await import('./timed-challenge.service');
      const timedChallengeService = this.injector.get(TimedChallengeService);
      timedChallengeService.clearUserData();

      const { DailyStreakService } = await import('./daily-streak.service');
      const streakService = this.injector.get(DailyStreakService);
      streakService.clearUserData();

      const { CoinsService } = await import('./coins.service');
      const coinsService = this.injector.get(CoinsService);
      coinsService.reset();

      const { BadgeService } = await import('./badge.service');
      const badgeService = this.injector.get(BadgeService);
      badgeService.reset();

      const { DeutschService } = await import('./vocab.service');
      const vocabService = this.injector.get(DeutschService);
      vocabService.clearUserData();

    } catch {
      // User data cleanup failed non-critically
    }
  }

  /**
   * Create a new user account
   */
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      const user = await this.supabase.createUser(userData);

      // Auto-login after creation
      this.currentUser.set(user);
      this.saveUserToStorage(user);

      // Load streak data for new user
      await this.loadUserData(user.id);

      return user;
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  }

  /**
   * Get all users (for login page selection)
   */
  async getAllUsers(): Promise<User[]> {
    try {
      return await this.supabase.getAllUsers();
    } catch (error) {
      console.error('Get all users error:', error);
      return [];
    }
  }

  /**
   * Update last active timestamp for current user
   */
  async updateLastActive(): Promise<void> {
    const user = this.currentUser();
    if (user) {
      await this.supabase.updateLastActive(user.id);
    }
  }

  /**
   * Load user from localStorage (session persistence)
   */
  private loadUserFromStorage(): void {
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      if (stored) {
        const user = JSON.parse(stored) as User;
        this.currentUser.set(user);

        // Update last active in background
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        this.supabase.updateLastActive(user.id).catch(() => {});

        // Load user data (streak, stats)
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        this.loadUserData(user.id).catch(() => {});
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }

  /**
   * Load user-specific data (streak, stats, achievements, time trials, coins, badges) after login
   */
  private async loadUserData(userId: string): Promise<void> {
    try {

      // Load streak
      const { DailyStreakService } = await import('./daily-streak.service');
      const streakService = this.injector.get(DailyStreakService);
      await streakService.loadStreak(userId);
      await streakService.checkAndUpdateStreak(userId);

      // Load stats
      const { StatsService } = await import('./stats.service');
      const statsService = this.injector.get(StatsService);
      await statsService.loadFromServer();

      // Load achievements
      const { AchievementsService } = await import('./achievements.service');
      const achievementsService = this.injector.get(AchievementsService);
      await achievementsService.loadFromServer(userId);

      // Load time trials
      const { TimedChallengeService } = await import('./timed-challenge.service');
      const timedChallengeService = this.injector.get(TimedChallengeService);
      await timedChallengeService.loadFromServer(userId);

      // Load coins
      const { CoinsService } = await import('./coins.service');
      const coinsService = this.injector.get(CoinsService);
      await coinsService.loadBalance(userId);

      // Load badges
      const { BadgeService } = await import('./badge.service');
      const badgeService = this.injector.get(BadgeService);
      await badgeService.loadEarnedBadges(userId);

      // Load Deutsch category data
      const { DeutschService } = await import('./vocab.service');
      const vocabService = this.injector.get(DeutschService);
      await vocabService.loadUserData(userId);

    } catch {
      // User data load failed non-critically
    }
  }

  /**
   * Save user to localStorage
   */
  private saveUserToStorage(user: User): void {
    try {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  }
}
