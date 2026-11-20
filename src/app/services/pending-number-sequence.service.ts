import { Injectable } from '@angular/core';
import type { NumberSequenceProblem } from './number-sequence-generator.service';

export interface PendingNumberSequence {
  problem: NumberSequenceProblem;
  /** Parallel to gapIndices: string drafts (may be empty) */
  gapAnswers: string[];
  activeGapIndex: number;
}

const STORAGE_KEY = 'schlaufuchs-pending-number-sequence';

@Injectable({ providedIn: 'root' })
export class PendingNumberSequenceService {
  load(): PendingNumberSequence | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as Partial<PendingNumberSequence>;
      if (!this.isValid(data)) {
        this.clear();
        return null;
      }
      return data;
    } catch {
      this.clear();
      return null;
    }
  }

  save(pending: PendingNumberSequence): void {
    if (!this.isValid(pending)) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    } catch {
      // ignore
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  private isValid(data: Partial<PendingNumberSequence> | null | undefined): data is PendingNumberSequence {
    if (!data?.problem) return false;
    const p = data.problem;
    if (!Array.isArray(p.terms) || p.terms.length < 3) return false;
    if (!Array.isArray(p.gapIndices) || p.gapIndices.length < 1) return false;
    if (!Array.isArray(data.gapAnswers) || data.gapAnswers.length !== p.gapIndices.length) return false;
    if (!Number.isInteger(data.activeGapIndex) || (data.activeGapIndex as number) < 0) return false;
    if ((data.activeGapIndex as number) >= p.gapIndices.length) return false;
    if (!Number.isInteger(p.step) || p.step === 0) return false;
    const kind = p.kind ?? 'arithmetic';
    if (
      kind !== 'arithmetic' &&
      kind !== 'alternating-add' &&
      kind !== 'geometric' &&
      kind !== 'alternating-mul'
    ) {
      return false;
    }
    if (
      (kind === 'alternating-add' || kind === 'alternating-mul') &&
      (!Number.isInteger(p.stepB) || (p.stepB as number) <= 0)
    ) {
      return false;
    }
    // Normalize older pending payloads without kind
    p.kind = kind;
    return p.terms.every((t) => Number.isInteger(t) && t >= 1);
  }
}
