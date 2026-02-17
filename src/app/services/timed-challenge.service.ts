import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface TimeTrialResult {
  exerciseTypes: string[];
  correctCount: number;
  totalCount: number;
  accuracy: number;
  completedAt: string;
}

export interface PersonalBest {
  correctCount: number;
  accuracy: number;
  achievedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimedChallengeService {
  private readonly storageKey = 'schlaufuchs-time-trials';

  // Server sync dependencies
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  private readonly personalBests = signal<Record<string, PersonalBest>>({});

  constructor() {
    this.load();
    this.loadFromServerIfAuthenticated();
  }

  getBestForTypes(types: string[]): PersonalBest | null {
    const key = types.sort().join(',');
    return this.personalBests()[key] || null;
  }

  recordResult(result: TimeTrialResult): boolean {
    const key = result.exerciseTypes.sort().join(',');
    const current = this.personalBests()[key];
    const isNewBest = !current || result.correctCount > current.correctCount;

    if (isNewBest) {
      this.personalBests.update(bests => ({
        ...bests,
        [key]: {
          correctCount: result.correctCount,
          accuracy: result.accuracy,
          achievedAt: result.completedAt
        }
      }));
      this.persist();

      // Sync to server in background
      this.syncToServer(result);
    }

    return isNewBest;
  }

  private load(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.personalBests.set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load time trial data:', error);
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.personalBests()));
    } catch (error) {
      console.error('Failed to persist time trial data:', error);
    }
  }

  /**
   * Clear all user data (called on logout)
   */
  clearUserData(): void {
    this.personalBests.set({});
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Load personal bests from server for specific user (called on login)
   */
  async loadFromServer(userId: string): Promise<void> {
    try {

      const bestRecords = await this.supabase.getPersonalBests(userId);

      // Convert array to Record<string, PersonalBest>
      const bestsMap: Record<string, PersonalBest> = {};
      for (const record of bestRecords) {
        const key = record.exercise_types.sort().join(',');
        bestsMap[key] = {
          correctCount: record.correct_count,
          accuracy: record.accuracy,
          achievedAt: record.achieved_at || new Date().toISOString()
        };
      }

      this.personalBests.set(bestsMap);
      this.persist(); // Cache locally
    } catch (error) {
      console.warn('[TimedChallenge] Failed to load from server, using local cache:', error);
    }
  }

  // ============================================================================
  // SERVER SYNC METHODS
  // ============================================================================

  /**
   * Load personal bests from server if authenticated
   */
  private async loadFromServerIfAuthenticated(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    const userId = this.auth.currentUser()!.id;
    await this.loadFromServer(userId);
  }

  /**
   * Sync result to server
   */
  private async syncToServer(result: TimeTrialResult): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    try {
      const userId = this.auth.currentUser()!.id;

      await this.supabase.upsertPersonalBest(userId, {
        exercise_types: result.exerciseTypes,
        correct_count: result.correctCount,
        total_count: result.totalCount,
        accuracy: result.accuracy
      });

    } catch (error) {
      console.warn('[TimedChallenge] Failed to sync to server:', error);
    }
  }
}
