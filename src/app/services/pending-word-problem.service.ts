import { Injectable } from '@angular/core';
import { WordProblem, WordProblemType } from '../models/word-problem.model';

const STORAGE_KEY = 'schlaufuchs-pending-word-problem';
const VALID_TYPES = new Set<WordProblemType>([
  'two-step',
  'addition',
  'subtraction',
  'multiplication',
  'division',
]);

/**
 * Persists the current unsolved Sachaufgabe so leaving and re-entering
 * resumes the same task until it is answered.
 */
@Injectable({ providedIn: 'root' })
export class PendingWordProblemService {
  load(): WordProblem | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as Partial<WordProblem>;
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

  save(problem: WordProblem): void {
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

  private isValid(data: Partial<WordProblem> | null | undefined): data is WordProblem {
    if (!data || typeof data !== 'object') return false;
    if (!VALID_TYPES.has(data.type as WordProblemType)) return false;
    if (typeof data.storyText !== 'string' || data.storyText.length === 0) return false;
    if (!Number.isInteger(data.correctAnswer) || (data.correctAnswer as number) < 0) return false;
    if (typeof data.templateId !== 'string' || data.templateId.length === 0) return false;

    if (data.kind === 'two-step' || data.type === 'two-step') {
      return (
        data.kind === 'two-step' &&
        typeof data.icon === 'string' &&
        Array.isArray(data.givenNumbers) &&
        Array.isArray(data.expectedAddends) &&
        typeof data.sampleRechnung === 'string' &&
        typeof data.sampleAntwort === 'string'
      );
    }

    if (data.kind === 'one-step') {
      return (
        Number.isInteger(data.operandA) &&
        Number.isInteger(data.operandB) &&
        (data.operandA as number) >= 0 &&
        (data.operandB as number) >= 0
      );
    }

    return false;
  }
}
