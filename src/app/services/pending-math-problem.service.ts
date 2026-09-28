import { Injectable } from '@angular/core';
import type { OperationType } from './problem-generator.service';

export interface PendingMathProblem {
  operation: OperationType;
  operandA: number;
  operandB: number;
}

const STORAGE_KEY = 'schlaufuchs-pending-math-problem';
const VALID_OPS = new Set<OperationType>(['addition', 'subtraction', 'multiplication', 'division']);

/**
 * Persists the current unsolved practice-mode math problem so leaving and
 * re-entering Mathe training resumes the same task until it is answered.
 */
@Injectable({ providedIn: 'root' })
export class PendingMathProblemService {
  load(): PendingMathProblem | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as Partial<PendingMathProblem>;
      if (!this.isValid(data)) {
        this.clear();
        return null;
      }
      return {
        operation: data.operation!,
        operandA: data.operandA!,
        operandB: data.operandB!,
      };
    } catch {
      this.clear();
      return null;
    }
  }

  save(problem: PendingMathProblem): void {
    if (!this.isValid(problem)) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(problem));
    } catch {
      // ignore quota / private mode
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  private isValid(data: Partial<PendingMathProblem> | null | undefined): data is PendingMathProblem {
    if (!data) return false;
    if (!VALID_OPS.has(data.operation as OperationType)) return false;
    if (!Number.isInteger(data.operandA) || !Number.isInteger(data.operandB)) return false;
    if (data.operandA! < 0 || data.operandB! < 0) return false;
    return true;
  }
}
