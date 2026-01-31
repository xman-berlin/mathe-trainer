import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

interface ReihenMastery {
  currentStreak: number;
  mastered: boolean;
  masteredAt?: string;
}

type MultiplicationMastery = Record<number, ReihenMastery>;

interface AchievementsData {
  multiplicationMastery: MultiplicationMastery;
}

@Injectable({ providedIn: 'root' })
export class AchievementsService {
  private readonly storageKey = 'mathe-trainer-achievements';
  private readonly MASTERY_THRESHOLD = 10;

  // Server sync dependencies
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  private multiplicationMastery = signal<MultiplicationMastery>({});

  readonly masteryData = this.multiplicationMastery.asReadonly();

  readonly masteredReihen = computed(() => {
    const mastery = this.multiplicationMastery();
    return Object.entries(mastery)
      .filter(([, data]) => data.mastered)
      .map(([reihe]) => Number(reihe))
      .sort((a, b) => a - b);
  });

  readonly totalMastered = computed(() => this.masteredReihen().length);

  constructor() {
    this.load();
    this.loadFromServerIfAuthenticated();
  }

  recordMultiplicationResult(reihe: number, isCorrect: boolean) {
    const current = this.multiplicationMastery();
    const reiheData = current[reihe] ?? { currentStreak: 0, mastered: false };

    if (isCorrect) {
      const newStreak = reiheData.currentStreak + 1;

      // Check if mastery achieved
      const newMastered = newStreak >= this.MASTERY_THRESHOLD;
      const masteredAt = newMastered && !reiheData.mastered ? new Date().toISOString() : reiheData.masteredAt;

      this.multiplicationMastery.set({
        ...current,
        [reihe]: {
          currentStreak: newStreak,
          mastered: newMastered,
          masteredAt
        }
      });
    } else {
      // Reset streak on incorrect answer (but keep mastery status if already achieved)
      this.multiplicationMastery.set({
        ...current,
        [reihe]: {
          ...reiheData,
          currentStreak: 0
        }
      });
    }

    this.persist();

    // Sync to server in background
    this.syncToServer(reihe);
  }

  getMastery(reihe: number): ReihenMastery {
    return this.multiplicationMastery()[reihe] ?? { currentStreak: 0, mastered: false };
  }

  private load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        this.persist();
        return;
      }
      const parsed: AchievementsData = JSON.parse(raw);
      this.multiplicationMastery.set(parsed.multiplicationMastery ?? {});
    } catch {
      this.multiplicationMastery.set({});
      this.persist();
    }
  }

  private persist() {
    const payload: AchievementsData = {
      multiplicationMastery: this.multiplicationMastery()
    };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }

  /**
   * Clear all user data (called on logout)
   */
  clearUserData(): void {
    console.log('[Achievements] Clearing user data');
    this.multiplicationMastery.set({});
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Load achievements from server for specific user (called on login)
   */
  async loadFromServer(userId: string): Promise<void> {
    try {
      console.log('[Achievements] Loading mastery from server for user:', userId);

      const masteryRecords = await this.supabase.getMastery(userId);

      // Convert array to Record<number, ReihenMastery>
      const masteryMap: MultiplicationMastery = {};
      for (const record of masteryRecords) {
        masteryMap[record.reihe] = {
          currentStreak: record.current_streak,
          mastered: record.mastered,
          masteredAt: record.mastered_at || undefined
        };
      }

      console.log('[Achievements] Loaded mastery data:', masteryMap);
      this.multiplicationMastery.set(masteryMap);
      this.persist(); // Cache locally
    } catch (error) {
      console.warn('[Achievements] Failed to load from server, using local cache:', error);
    }
  }

  // ============================================================================
  // SERVER SYNC METHODS
  // ============================================================================

  /**
   * Load achievements from server if authenticated
   */
  private async loadFromServerIfAuthenticated(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      console.log('[Achievements] Not authenticated, skipping server load');
      return;
    }

    const userId = this.auth.currentUser()!.id;
    await this.loadFromServer(userId);
  }

  /**
   * Sync single reihe to server
   */
  private async syncToServer(reihe: number): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    try {
      const userId = this.auth.currentUser()!.id;
      const masteryData = this.getMastery(reihe);

      await this.supabase.upsertMastery(userId, {
        user_id: userId,
        reihe,
        current_streak: masteryData.currentStreak,
        mastered: masteryData.mastered,
        mastered_at: masteryData.masteredAt || null
      });

      console.log('[Achievements] Synced mastery for reihe', reihe, 'to server');
    } catch (error) {
      console.warn('[Achievements] Failed to sync to server:', error);
    }
  }
}
