import { Injectable } from '@angular/core';

export type OperationType = 'addition' | 'subtraction' | 'multiplication' | 'division';

export interface Problem {
  operandA: number;
  operandB: number;
  answer: number;
  operation: OperationType;
  symbol: string;
  text: string;
}

export interface GenerateOptions {
  /**
   * When true, generate exactly the requested level's pattern (no lower-level mix).
   * Default false: 80% current level, 20% random lower level.
   */
  exact?: boolean;
}

/**
 * Service for generating math problems with level-based difficulty.
 *
 * Level definitions:
 *
 * Addition / Subtraction (6 levels):
 *   1 — 1–10,   no carry
 *   2 — 1–100,  no carry
 *   3 — 1–100,  10er carry  (single decade crossing, result ≤ 100)
 *   4 — 1–100,  >10er carry (multi-decade crossing, result ≤ 100)
 *   5 — 100–1000, hundreds only (…00)
 *   6 — 100–1000, tens+hundreds (ones = 0)
 *
 * Multiplication (6 levels):
 *   1 — 1–5  × 1–5
 *   2 — 1–10 × 1–10
 *   3 — 1–10 × 11–20
 *   4 — 11–20 × 11–20
 *   5 — 1–10 × 1–100
 *   6 — 11–100 × 11–100
 *
 * Division (4 levels, always whole number, no remainder):
 *   1 — dividend ≤ 25,   divisor 1–5
 *   2 — dividend ≤ 100,  divisor 1–10
 *   3 — dividend ≤ 200,  divisor 1–10
 *   4 — dividend ≤ 1000, divisor 1–10
 *
 * Mix (default): 80% current level, 20% random level from 1 … current−1.
 * Lower-level results stay within the current level's Zahlenraum.
 */
@Injectable({
  providedIn: 'root',
})
export class ProblemGeneratorService {
  /** Probability of using the current level (vs. a random lower one). */
  static readonly CURRENT_LEVEL_WEIGHT = 0.8;

  /** Per-key counters so every 5th task is a lower-level review (exact 20%). */
  private readonly mixCounters = new Map<string, number>();

  // ─── Utility ─────────────────────────────────────────────────────────────

  randomInt(min: number, max: number): number {
    if (max < min) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 80% → requested level; 20% → lower-level review (every 5th call).
   * For addition/subtraction at Löwe/Drache (level ≥ 5), the review pool is
   * levels 1–4 only (Zahlenraum ≤ 100), so Zehnerübertrag im Hunderterraum
   * keeps being practiced.
   * Level 1 always stays 1.
   */
  pickEffectiveLevel(
    level: number,
    exact = false,
    kind: 'addSub' | 'default' = 'default'
  ): number {
    const clamped = Math.max(1, Math.floor(level));
    if (exact || clamped <= 1) {
      return clamped;
    }

    const key = `${kind}:${clamped}`;
    const count = (this.mixCounters.get(key) ?? 0) + 1;
    this.mixCounters.set(key, count);

    // Every 5th problem → review (20%)
    if (count % 5 !== 0) {
      return clamped;
    }

    // Löwe/Drache (+/−): review only the 100er Zahlenraum (levels 1–4)
    if (kind === 'addSub' && clamped >= 5) {
      return this.randomInt(1, 4);
    }

    return this.randomInt(1, clamped - 1);
  }

  /** Test helper: reset mix counters. */
  resetMixCounters(): void {
    this.mixCounters.clear();
  }

  // ─── Addition ─────────────────────────────────────────────────────────────

  generateAddition(level = 3, options?: GenerateOptions): Problem {
    const effective = this.pickEffectiveLevel(level, options?.exact === true, 'addSub');
    let a: number;
    let b: number;

    switch (effective) {
      case 1: {
        // 1–10, no carry: a + b ≤ 10
        a = this.randomInt(1, 9);
        b = this.randomInt(1, 10 - a);
        break;
      }
      case 2: {
        // 1–100, no carry: ones digits don't cross a decade
        a = this.randomInt(1, 98);
        // b must not cause ones carry: (a%10) + b%10 ≤ 9, result ≤ 100
        const aOnes = a % 10;
        const maxBOnes = 9 - aOnes;
        const maxB = Math.min(99 - a, maxBOnes === 0 ? 0 : maxBOnes + Math.floor((99 - a) / 10) * 10);
        b = this.randomInt(1, Math.max(1, maxB));
        // Ensure no carry at ones place
        b = Math.min(b, 9 - aOnes + Math.floor(b / 10) * 10);
        if (b < 1) b = 1;
        break;
      }
      case 3: {
        // 1–100, single 10er carry: exactly one decade crossed, result ≤ 100
        b = this.randomInt(1, 9);
        const minOnes = 11 - b; // ones digit of a must make carry with b
        const ones = this.randomInt(minOnes, 9);
        const maxTens = Math.floor((100 - b - ones) / 10);
        const tens = this.randomInt(0, Math.max(0, maxTens));
        a = tens * 10 + ones;
        break;
      }
      case 4: {
        // 1–100, multi-decade carry: b ≥ 10 so result crosses more than one decade, result ≤ 100
        b = this.randomInt(10, 50);
        a = this.randomInt(Math.ceil(b / 10) * 10 - b + 1, 100 - b);
        // Ensure at least one carry
        if ((a % 10) + (b % 10) <= 9) {
          // Force ones carry by adjusting ones of a
          const bOnes = b % 10;
          if (bOnes > 0) {
            a = Math.floor(a / 10) * 10 + this.randomInt(10 - bOnes, 9);
          }
        }
        if (a + b > 100) a = 100 - b;
        if (a < 1) a = 1;
        break;
      }
      case 5: {
        // Löwe: hundreds only (…00), operands 100–900, result 200–1000
        a = this.randomInt(1, 9) * 100;
        b = this.randomInt(1, Math.floor((1000 - a) / 100)) * 100;
        break;
      }
      case 6:
      default: {
        // Drache: 100–1000, ones = 0, prefer tens carry, result ≤ 1000
        b = this.randomInt(10, 90) * 10; // 100…900
        const bTensDigit = Math.floor(b / 10) % 10;
        if (bTensDigit > 0) {
          const aTensDigit = this.randomInt(10 - bTensDigit, 9);
          const maxHundreds = Math.floor((1000 - b - aTensDigit * 10) / 100);
          if (maxHundreds >= 1) {
            a = this.randomInt(1, maxHundreds) * 100 + aTensDigit * 10;
          } else {
            a = this.randomInt(10, Math.floor((1000 - b) / 10)) * 10;
          }
        } else {
          a = this.randomInt(10, Math.floor((1000 - b) / 10)) * 10; // ≥ 100
        }
        if (a < 100) a = 100;
        if (a + b > 1000) a = Math.floor((1000 - b) / 10) * 10;
        if (a < 100) {
          // b too large — shrink b
          b = 100;
          a = this.randomInt(10, 90) * 10;
        }
        break;
      }
    }

    const answer = a + b;
    return { operandA: a, operandB: b, answer, operation: 'addition', symbol: '+', text: `${a} + ${b} = ?` };
  }

  // ─── Subtraction ──────────────────────────────────────────────────────────

  generateSubtraction(level = 3, options?: GenerateOptions): Problem {
    const effective = this.pickEffectiveLevel(level, options?.exact === true, 'addSub');
    let a: number;
    let b: number;

    switch (effective) {
      case 1: {
        // 1–10, no borrow: result ≥ 0
        a = this.randomInt(1, 10);
        b = this.randomInt(1, a);
        break;
      }
      case 2: {
        // 1–100, no borrow: ones of a ≥ ones of b
        a = this.randomInt(2, 99);
        const aOnes = a % 10;
        b = this.randomInt(1, Math.max(1, aOnes === 0 ? Math.floor(a / 10) * 10 - 1 : aOnes));
        if (a - b < 1) b = a - 1;
        break;
      }
      case 3: {
        // 1–100, 10er borrow: b 1–9, ones of a < ones of b (single borrow)
        b = this.randomInt(1, 9);
        const ones = this.randomInt(0, b - 1);
        const tens = this.randomInt(1, 10);
        a = tens * 10 + ones;
        break;
      }
      case 4: {
        // 1–100, >10er borrow: b ≥ 10, result ≥ 1
        b = this.randomInt(10, 50);
        a = this.randomInt(b + 1, 100);
        if ((a % 10) >= (b % 10) && b % 10 > 0) {
          // Force borrow at ones
          a = Math.floor(a / 10) * 10 + this.randomInt(0, (b % 10) - 1);
        }
        if (a - b < 1) a = b + 1;
        break;
      }
      case 5: {
        // Löwe: hundreds only (…00), operands/result in 100–1000
        a = this.randomInt(2, 10) * 100; // 200…1000
        b = this.randomInt(1, a / 100 - 1) * 100; // 100…a−100
        break;
      }
      case 6:
      default: {
        // Drache: 100–1000, ones = 0, prefer tens borrow, result ≥ 100
        b = this.randomInt(10, 80) * 10; // 100…800
        const bTensDigit = Math.floor(b / 10) % 10;
        if (bTensDigit > 0) {
          const aTensDigit = this.randomInt(0, bTensDigit - 1);
          const candidates: number[] = [];
          for (let h = 1; h <= 10; h++) {
            const candidate = h * 100 + aTensDigit * 10;
            if (candidate <= 1000 && candidate - b >= 100) {
              candidates.push(candidate);
            }
          }
          a =
            candidates.length > 0
              ? candidates[this.randomInt(0, candidates.length - 1)]
              : Math.min(1000, b + 100);
        } else {
          const minA = b + 100;
          a = this.randomInt(Math.ceil(minA / 10), 100) * 10;
        }
        if (a > 1000) a = 1000;
        if (a - b < 100) a = Math.min(1000, b + 100);
        if (b < 100) b = 100;
        break;
      }
    }

    const answer = a - b;
    return { operandA: a, operandB: b, answer, operation: 'subtraction', symbol: '−', text: `${a} − ${b} = ?` };
  }

  // ─── Multiplication ───────────────────────────────────────────────────────

  generateMultiplication(levelOrAllowed: number | Set<number> = 2, options?: GenerateOptions): Problem {
    let a: number;
    let b: number;

    // Legacy path: Set<number> passed (BalloonPop, old callers)
    if (levelOrAllowed instanceof Set) {
      const numbers = Array.from(levelOrAllowed);
      a = this.randomInt(1, 10);
      b = numbers.length > 0 ? numbers[Math.floor(Math.random() * numbers.length)] : this.randomInt(1, 10);
    } else {
      const level = this.pickEffectiveLevel(levelOrAllowed, options?.exact === true);
      switch (level) {
        case 1:
          a = this.randomInt(1, 5);
          b = this.randomInt(1, 5);
          break;
        case 2:
          a = this.randomInt(1, 10);
          b = this.randomInt(1, 10);
          break;
        case 3:
          a = this.randomInt(1, 10);
          b = this.randomInt(11, 20);
          break;
        case 4:
          a = this.randomInt(11, 20);
          b = this.randomInt(11, 20);
          break;
        case 5:
          a = this.randomInt(1, 10);
          b = this.randomInt(1, 100);
          break;
        case 6:
        default:
          a = this.randomInt(11, 100);
          b = this.randomInt(11, 100);
          break;
      }
    }

    return {
      operandA: a,
      operandB: b,
      answer: a * b,
      operation: 'multiplication',
      symbol: '×',
      text: `${a} × ${b} = ?`,
    };
  }

  // ─── Division ─────────────────────────────────────────────────────────────

  generateDivision(levelOrAllowed: number | Set<number> = 2, options?: GenerateOptions): Problem {
    let b: number;
    let maxQuotient: number;

    // Legacy path: Set<number> passed
    if (levelOrAllowed instanceof Set) {
      const numbers = Array.from(levelOrAllowed);
      b = numbers.length > 0 ? numbers[Math.floor(Math.random() * numbers.length)] : this.randomInt(1, 10);
      maxQuotient = 10;
    } else {
      const level = this.pickEffectiveLevel(levelOrAllowed, options?.exact === true);
      switch (level) {
        case 1:
          b = this.randomInt(1, 5);
          maxQuotient = Math.floor(25 / b);
          break;
        case 2:
          b = this.randomInt(1, 10);
          maxQuotient = Math.min(10, Math.floor(100 / b));
          break;
        case 3:
          b = this.randomInt(1, 10);
          maxQuotient = Math.floor(200 / b);
          break;
        case 4:
        default:
          b = this.randomInt(1, 10);
          maxQuotient = Math.floor(1000 / b);
          break;
      }
    }

    const quotient = this.randomInt(1, Math.max(1, maxQuotient));
    const a = b * quotient;

    return {
      operandA: a,
      operandB: b,
      answer: quotient,
      operation: 'division',
      symbol: '÷',
      text: `${a} ÷ ${b} = ?`,
    };
  }

  /**
   * Minimum Zahlenraum required so addition/subtraction level patterns can appear.
   * Löwe/Drache need 1000 even if the user setting is still 100.
   */
  minZahlenraumForAddSub(level: number): number {
    if (level <= 1) return 10;
    if (level <= 4) return 100;
    return 1000;
  }

  /**
   * Generate a random problem of the specified types.
   * levels: per-type level map — defaults to level 2/3 if not provided.
   * allowedNumbers: legacy Set<number> filter for ×/÷ (kept for BalloonPop compatibility).
   * maxValue: optional cap on operands (inclusive). For +/−, raised to at least the
   *           level's Zahlenraum (so Löwe/Drache are not blocked by a stale "bis 100" setting).
   *           Problems outside the effective cap are re-generated (up to 50 retries,
   *           then level 1 is used as fallback).
   */
  generateProblem(
    types: OperationType[],
    allowedNumbers?: Set<number>,
    levels?: Partial<Record<OperationType, number>>,
    maxValue?: number
  ): Problem {
    const type = types[Math.floor(Math.random() * types.length)];

    const levelForType =
      type === 'addition'
        ? (levels?.addition ?? 3)
        : type === 'subtraction'
          ? (levels?.subtraction ?? 3)
          : type === 'multiplication'
            ? (levels?.multiplication ?? 2)
            : (levels?.division ?? 2);

    // +/−: difficulty level wins over a smaller Zahlenraum setting (e.g. 100 while on Drache)
    const effectiveMax =
      maxValue === undefined
        ? undefined
        : type === 'addition' || type === 'subtraction'
          ? Math.max(maxValue, this.minZahlenraumForAddSub(levelForType))
          : maxValue;

    const generate = (): Problem => {
      switch (type) {
        case 'addition':
          return this.generateAddition(levels?.addition ?? 3);
        case 'subtraction':
          return this.generateSubtraction(levels?.subtraction ?? 3);
        case 'multiplication': {
          // Within Zahlenraum ≤ 100: restrict to small times table (1–10 × 1–10, level 2)
          const multLevel =
            allowedNumbers && allowedNumbers.size > 0
              ? allowedNumbers
              : effectiveMax && effectiveMax <= 100
                ? Math.min(levels?.multiplication ?? 2, 2)
                : (levels?.multiplication ?? 2);
          return this.generateMultiplication(multLevel);
        }
        case 'division': {
          // Within Zahlenraum ≤ 100: restrict divisor range so dividend stays in range (level 2)
          const divLevel =
            allowedNumbers && allowedNumbers.size > 0
              ? allowedNumbers
              : effectiveMax && effectiveMax <= 100
                ? Math.min(levels?.division ?? 2, 2)
                : (levels?.division ?? 2);
          return this.generateDivision(divLevel);
        }
      }
    };

    if (!effectiveMax) {
      return generate();
    }

    // Retry loop: for multiplication/division cap the result (answer), for others cap operands
    for (let attempt = 0; attempt < 50; attempt++) {
      const problem = generate();
      const withinRange =
        problem.operation === 'multiplication'
          ? problem.answer <= effectiveMax
          : problem.operandA <= effectiveMax && problem.operandB <= effectiveMax;
      if (withinRange) {
        return problem;
      }
    }

    // Fallback: level 1 guarantees small numbers (exact — no mix)
    switch (type) {
      case 'addition':
        return this.generateAddition(1, { exact: true });
      case 'subtraction':
        return this.generateSubtraction(1, { exact: true });
      case 'multiplication':
        return this.generateMultiplication(1, { exact: true });
      case 'division':
        return this.generateDivision(1, { exact: true });
    }
  }
}
