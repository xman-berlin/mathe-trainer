import { Injectable, signal, computed } from '@angular/core';
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

  constructor(private supabase: SupabaseService) {
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
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    this.currentUser.set(null);
    localStorage.removeItem(CURRENT_USER_KEY);
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
        this.supabase.updateLastActive(user.id).catch((err) => {
          console.warn('Failed to update last active:', err);
        });
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      localStorage.removeItem(CURRENT_USER_KEY);
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
