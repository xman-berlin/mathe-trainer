import { Injectable, inject, signal, computed } from '@angular/core';
import type { DifficultyLevels, DifficultyOperationType, DifficultyState } from '../models/user.model';
import { SupabaseService } from './supabase.service';

// ─── Level name/emoji metadata ──────────────────────────────────────────────

export interface DifficultyTier {
  level: number;
  name: string;
  emoji: string;
}

export const DIFFICULTY_TIERS: DifficultyTier[] = [
  { level: 1, name: 'Maus', emoji: '🐭' },
  { level: 2, name: 'Fuchs', emoji: '🦊' },
  { level: 3, name: 'Wolf', emoji: '🐺' },
  { level: 4, name: 'Adler', emoji: '🦅' },
  { level: 5, name: 'Löwe', emoji: '🦁' },
  { level: 6, name: 'Drache', emoji: '🐉' },
];

export const MAX_LEVELS: Record<DifficultyOperationType, number> = {
  addition: 6,
  subtraction: 6,
  multiplication: 6,
  division: 4,
};

export const DEFAULT_LEVELS: Record<DifficultyOperationType, number> = {
  addition: 3,
  subtraction: 3,
  multiplication: 2,
  division: 2,
};

// Level up after this many correct answers in a row
const STREAK_UP = 5;
// Level down when this many of the last N answers are wrong
const WRONG_THRESHOLD = 3;
const RECENT_WINDOW = 5;

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DifficultyService {
  private readonly supabase = inject(SupabaseService);

  private readonly _levels = signal<DifficultyLevels>({});
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUserId: string | null = null;

  readonly levels = this._levels.asReadonly();

  // Computed per-type levels for easy template consumption
  readonly additionLevel = computed(() => this.getLevel('addition'));
  readonly subtractionLevel = computed(() => this.getLevel('subtraction'));
  readonly multiplicationLevel = computed(() => this.getLevel('multiplication'));
  readonly divisionLevel = computed(() => this.getLevel('division'));

  // Level-change events — set transiently so components can react via effect()
  readonly lastLevelUp = signal<{ type: DifficultyOperationType; level: number } | null>(null);
  readonly lastLevelDown = signal<{ type: DifficultyOperationType; level: number } | null>(null);

  clearLastLevelUp(): void { this.lastLevelUp.set(null); }
  clearLastLevelDown(): void { this.lastLevelDown.set(null); }

  // ─── Load / clear ──────────────────────────────────────────────

  async loadForUser(userId: string): Promise<void> {
    this.currentUserId = userId;
    const remote = await this.supabase.getDifficultyLevels(userId);
    if (remote && Object.keys(remote).length > 0) {
      this._levels.set(remote);
    } else {
      this._levels.set({});
    }
  }

  clearUser(): void {
    this.currentUserId = null;
    this._levels.set({});
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
  }

  // ─── Getters ───────────────────────────────────────────────────

  getLevel(type: DifficultyOperationType): number {
    return this._levels()[type]?.level ?? DEFAULT_LEVELS[type];
  }

  getState(type: DifficultyOperationType): DifficultyState {
    return (
      this._levels()[type] ?? {
        level: DEFAULT_LEVELS[type],
        streak: 0,
        recentResults: [],
      }
    );
  }

  getTier(type: DifficultyOperationType): DifficultyTier {
    const level = this.getLevel(type);
    return DIFFICULTY_TIERS[Math.min(level, DIFFICULTY_TIERS.length) - 1];
  }

  getTierForLevel(level: number): DifficultyTier {
    return DIFFICULTY_TIERS[Math.min(level, DIFFICULTY_TIERS.length) - 1];
  }

  getMaxLevel(type: DifficultyOperationType): number {
    return MAX_LEVELS[type];
  }

  // ─── Record result + level transitions ─────────────────────────

  recordResult(type: DifficultyOperationType, correct: boolean): void {
    const current = this.getState(type);
    const maxLevel = MAX_LEVELS[type];

    // Update streak
    const streak = correct ? current.streak + 1 : 0;

    // Update rolling window (last RECENT_WINDOW results)
    const recentResults = [...current.recentResults, correct].slice(-RECENT_WINDOW);

    // Determine new level
    let level = current.level;

    if (correct && streak >= STREAK_UP) {
      const prevLevel = level;
      level = Math.min(level + 1, maxLevel);
      // Reset streak after levelling up
      const nextState: DifficultyState = { level, streak: 0, recentResults: [] };
      this._updateType(type, nextState);
      this._schedulePersist();
      if (level > prevLevel) {
        this.lastLevelUp.set({ type, level });
      }
      return;
    }

    const wrongCount = recentResults.filter((r) => !r).length;
    if (recentResults.length >= RECENT_WINDOW && wrongCount >= WRONG_THRESHOLD) {
      const prevLevel = level;
      level = Math.max(level - 1, 1);
      // Reset window after levelling down
      const nextState: DifficultyState = { level, streak: 0, recentResults: [] };
      this._updateType(type, nextState);
      this._schedulePersist();
      if (level < prevLevel) {
        this.lastLevelDown.set({ type, level });
      }
      return;
    }

    this._updateType(type, { level, streak, recentResults });
    this._schedulePersist();
  }

  // ─── Internal helpers ──────────────────────────────────────────

  private _updateType(type: DifficultyOperationType, state: DifficultyState): void {
    this._levels.update((current) => ({ ...current, [type]: state }));
  }

  private _schedulePersist(): void {
    if (!this.currentUserId) return;
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      if (this.currentUserId) {
        this.supabase
          .updateDifficultyLevels(this.currentUserId, this._levels())
          .catch((err) => console.error('[DifficultyService] persist failed:', err));
      }
    }, 300);
  }
}
