import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { StatsService } from './stats.service';

export type PracticePlanBlockId =
  | 'math'
  | 'deutsch'
  | 'weekdays'
  | 'months'
  | 'alphabet'
  | 'clock';

export interface PracticePlanBlock {
  id: PracticePlanBlockId;
  label: string;
  route: string;
  target: number;
  progress: number;
}

const SEQUENCE_TARGET = 5;

@Injectable({ providedIn: 'root' })
export class PracticePlanService {
  private readonly stats = inject(StatsService);
  private readonly router = inject(Router);

  private readonly activeSignal = signal(false);
  private readonly pausedSignal = signal(false);
  private readonly blocksSignal = signal<PracticePlanBlock[]>([]);
  private readonly currentIndexSignal = signal(0);

  readonly isActive = this.activeSignal.asReadonly();
  readonly isPaused = this.pausedSignal.asReadonly();
  readonly blocks = this.blocksSignal.asReadonly();
  readonly currentIndex = this.currentIndexSignal.asReadonly();

  /** Plan is running and the child is currently in the guided flow (not left to home). */
  readonly isGuiding = computed(() => this.activeSignal() && !this.pausedSignal());

  readonly currentBlock = computed(() => {
    const blocks = this.blocksSignal();
    const index = this.currentIndexSignal();
    return blocks[index] ?? null;
  });

  readonly typesLocked = computed(() => {
    if (!this.isGuiding()) return false;
    const id = this.currentBlock()?.id;
    return id === 'math' || id === 'clock';
  });

  readonly progressLabel = computed(() => {
    const block = this.currentBlock();
    if (!block) return '';
    return `${block.label} ${block.progress}/${block.target}`;
  });

  startFromDailyGoals(): void {
    const mathTarget = Math.max(1, this.stats.currentGoal());
    const deutschTarget = Math.max(1, this.stats.currentDeutschGoal());
    const clockTarget = Math.max(1, this.stats.currentClockGoal());

    const blocks: PracticePlanBlock[] = [
      { id: 'math', label: 'Mathe', route: '/mathe/uebung', target: mathTarget, progress: 0 },
      {
        id: 'deutsch',
        label: 'Deutsch',
        route: '/deutsch/rechtschreibung',
        target: deutschTarget,
        progress: 0,
      },
      {
        id: 'weekdays',
        label: 'Wochentage',
        route: '/deutsch/wochentage',
        target: SEQUENCE_TARGET,
        progress: 0,
      },
      {
        id: 'months',
        label: 'Monate',
        route: '/deutsch/monate',
        target: SEQUENCE_TARGET,
        progress: 0,
      },
      {
        id: 'alphabet',
        label: 'Alphabet',
        route: '/deutsch/alphabet',
        target: SEQUENCE_TARGET,
        progress: 0,
      },
      { id: 'clock', label: 'Uhrzeit', route: '/uhrzeit/uebung', target: clockTarget, progress: 0 },
    ];

    this.blocksSignal.set(blocks);
    this.currentIndexSignal.set(0);
    this.pausedSignal.set(false);
    this.activeSignal.set(true);
    void this.router.navigateByUrl(blocks[0].route);
  }

  /**
   * Record one correct answer for the given plan block.
   * Ignores calls that do not match the active guided block.
   */
  recordCorrect(blockId: PracticePlanBlockId): void {
    if (!this.isGuiding()) return;

    const index = this.currentIndexSignal();
    const blocks = this.blocksSignal();
    const block = blocks[index];
    if (!block || block.id !== blockId) return;
    if (block.progress >= block.target) return;

    const updated = blocks.map((b, i) =>
      i === index ? { ...b, progress: b.progress + 1 } : b
    );
    this.blocksSignal.set(updated);

    if (updated[index].progress >= updated[index].target) {
      this.advance();
    }
  }

  /** Leave guided flow (e.g. via Zurück); plan stays resumable from home. */
  pause(): void {
    if (!this.activeSignal()) return;
    this.pausedSignal.set(true);
  }

  resume(): void {
    if (!this.activeSignal()) return;
    const block = this.currentBlock();
    if (!block) return;
    this.pausedSignal.set(false);
    void this.router.navigateByUrl(block.route);
  }

  cancel(): void {
    this.activeSignal.set(false);
    this.pausedSignal.set(false);
    this.blocksSignal.set([]);
    this.currentIndexSignal.set(0);
  }

  complete(): void {
    this.cancel();
    void this.router.navigateByUrl('/');
  }

  private advance(): void {
    const nextIndex = this.currentIndexSignal() + 1;
    const blocks = this.blocksSignal();

    if (nextIndex >= blocks.length) {
      this.complete();
      return;
    }

    this.currentIndexSignal.set(nextIndex);
    void this.router.navigateByUrl(blocks[nextIndex].route);
  }
}
