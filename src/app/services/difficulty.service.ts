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
  addition: 5, // Drache (6) temporarily disabled for +/−
  subtraction: 5,
  multiplication: 6,
  division: 6,
  numberSequences: 5,
};

export const DEFAULT_LEVELS: Record<DifficultyOperationType, number> = {
  addition: 3,
  subtraction: 3,
  multiplication: 2,
  division: 2,
  numberSequences: 2,
};

// Level up after this many correct answers in a row
export const DIFFICULTY_STREAK_UP = 5;
const STREAK_UP = DIFFICULTY_STREAK_UP;
// Level down when this many of the last N answers are wrong
const WRONG_THRESHOLD = 3;
const RECENT_WINDOW = 5;

export interface DifficultyLevelChangeEvent {
  type: DifficultyOperationType;
  /** Level before the change */
  fromLevel: number;
  /** Level after the change */
  level: number;
}

const STORAGE_PREFIX = 'schlaufuchs-difficulty-levels:';

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
  readonly lastLevelUp = signal<DifficultyLevelChangeEvent | null>(null);
  readonly lastLevelDown = signal<DifficultyLevelChangeEvent | null>(null);

  clearLastLevelUp(): void { this.lastLevelUp.set(null); }
  clearLastLevelDown(): void { this.lastLevelDown.set(null); }

  // ─── Load / clear ──────────────────────────────────────────────

  async loadForUser(userId: string): Promise<void> {
    this.currentUserId = userId;
    const local = this.loadLocal(userId);
    let remote: DifficultyLevels | null = null;
    try {
      remote = await this.supabase.getDifficultyLevels(userId);
    } catch (err) {
      console.error('[DifficultyService] remote load failed, using local cache:', err);
    }

    const merged = this.clampLevels(this.mergeLevels(local, remote ?? {}));
    this._levels.set(merged);
    this.persistLocal();

    // Push merged state when local was ahead of an empty/stale server (e.g. Docker was down)
    if (Object.keys(merged).length > 0 && this.isAheadOf(merged, remote ?? {})) {
      this._schedulePersist(0);
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
    const raw = this._levels()[type]?.level ?? DEFAULT_LEVELS[type];
    return Math.min(raw, MAX_LEVELS[type]);
  }

  getState(type: DifficultyOperationType): DifficultyState {
    const stored = this._levels()[type];
    if (!stored) {
      return {
        level: DEFAULT_LEVELS[type],
        streak: 0,
        recentResults: [],
      };
    }
    return {
      ...stored,
      level: Math.min(stored.level, MAX_LEVELS[type]),
    };
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

  /**
   * Raise a type to at least `level` (e.g. recover after empty-server wipe
   * when a pending harder problem is still in localStorage).
   */
  ensureAtLeast(type: DifficultyOperationType, level: number): void {
    const target = Math.min(Math.max(1, Math.floor(level)), MAX_LEVELS[type]);
    if (target <= this.getLevel(type)) return;
    const current = this.getState(type);
    this._updateType(type, {
      level: target,
      streak: current.level === target ? current.streak : 0,
      recentResults: current.level === target ? current.recentResults : [],
    });
    this._schedulePersist();
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
        this.lastLevelUp.set({ type, fromLevel: prevLevel, level });
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
        this.lastLevelDown.set({ type, fromLevel: prevLevel, level });
      }
      return;
    }

    this._updateType(type, { level, streak, recentResults });
    this._schedulePersist();
  }

  // ─── Internal helpers ──────────────────────────────────────────

  /** Cap stored levels to current MAX_LEVELS (e.g. +/− Drache disabled). */
  private clampLevels(levels: DifficultyLevels): DifficultyLevels {
    const next: DifficultyLevels = {};
    for (const key of Object.keys(levels) as DifficultyOperationType[]) {
      const state = levels[key];
      if (!state) continue;
      next[key] = {
        ...state,
        level: Math.min(state.level, MAX_LEVELS[key]),
      };
    }
    return next;
  }

  private mergeLevels(local: DifficultyLevels, remote: DifficultyLevels): DifficultyLevels {
    const keys = new Set([
      ...Object.keys(local),
      ...Object.keys(remote),
    ]) as Set<DifficultyOperationType>;
    const merged: DifficultyLevels = {};
    for (const key of keys) {
      const state = this.mergeState(local[key], remote[key]);
      if (state) merged[key] = state;
    }
    return merged;
  }

  private mergeState(
    local?: DifficultyState,
    remote?: DifficultyState
  ): DifficultyState | undefined {
    if (!local) return remote ? { ...remote, recentResults: [...remote.recentResults] } : undefined;
    if (!remote) return { ...local, recentResults: [...local.recentResults] };
    if (local.level !== remote.level) {
      return local.level > remote.level
        ? { ...local, recentResults: [...local.recentResults] }
        : { ...remote, recentResults: [...remote.recentResults] };
    }
    if (local.streak !== remote.streak) {
      return local.streak > remote.streak
        ? { ...local, recentResults: [...local.recentResults] }
        : { ...remote, recentResults: [...remote.recentResults] };
    }
    return local.recentResults.length >= remote.recentResults.length
      ? { ...local, recentResults: [...local.recentResults] }
      : { ...remote, recentResults: [...remote.recentResults] };
  }

  /** True if `a` has any type at a higher level (or same level with more streak) than `b`. */
  private isAheadOf(a: DifficultyLevels, b: DifficultyLevels): boolean {
    for (const key of Object.keys(a) as DifficultyOperationType[]) {
      const left = a[key];
      const right = b[key];
      if (!left) continue;
      if (!right) return true;
      if (left.level > right.level) return true;
      if (left.level === right.level && left.streak > right.streak) return true;
    }
    return false;
  }

  private storageKey(userId: string): string {
    return `${STORAGE_PREFIX}${userId}`;
  }

  private loadLocal(userId: string): DifficultyLevels {
    try {
      const raw = localStorage.getItem(this.storageKey(userId));
      if (!raw) return {};
      const parsed = JSON.parse(raw) as DifficultyLevels;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private persistLocal(): void {
    if (!this.currentUserId) return;
    try {
      localStorage.setItem(this.storageKey(this.currentUserId), JSON.stringify(this._levels()));
    } catch {
      // ignore quota / private mode
    }
  }

  private _updateType(type: DifficultyOperationType, state: DifficultyState): void {
    this._levels.update((current) => ({ ...current, [type]: state }));
    this.persistLocal();
  }

  private _schedulePersist(delayMs = 300): void {
    if (!this.currentUserId) return;
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      if (this.currentUserId) {
        this.persistLocal();
        this.supabase
          .updateDifficultyLevels(this.currentUserId, this._levels())
          .catch((err) => console.error('[DifficultyService] persist failed:', err));
      }
    }, delayMs);
  }
}
