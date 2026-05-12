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
 *   5 — 1–1000, 10er carry  (result ≤ 1000)
 *   6 — 1–1000, >10er carry (result ≤ 1000)
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
 */
@Injectable({
  providedIn: 'root',
})
export class ProblemGeneratorService {
  // ─── Utility ─────────────────────────────────────────────────────────────

  randomInt(min: number, max: number): number {
    if (max < min) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ─── Addition ─────────────────────────────────────────────────────────────

  generateAddition(level = 3): Problem {
    let a: number;
    let b: number;

    switch (level) {
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
        // 1–1000, 10er carry, result ≤ 1000
        b = this.randomInt(1, 9);
        const minOnes5 = 11 - b;
        const ones5 = this.randomInt(minOnes5, 9);
        const maxTens5 = Math.floor((1000 - b - ones5) / 10);
        const tens5 = this.randomInt(0, Math.max(0, maxTens5));
        a = tens5 * 10 + ones5;
        break;
      }
      case 6:
      default: {
        // 1–1000, multi-decade carry, result ≤ 1000
        b = this.randomInt(10, 200);
        a = this.randomInt(b, 1000 - b);
        if ((a % 10) + (b % 10) <= 9) {
          const bOnes = b % 10;
          if (bOnes > 0) {
            a = Math.floor(a / 10) * 10 + this.randomInt(10 - bOnes, 9);
          }
        }
        if (a + b > 1000) a = 1000 - b;
        if (a < 1) a = 1;
        break;
      }
    }

    const answer = a + b;
    return { operandA: a, operandB: b, answer, operation: 'addition', symbol: '+', text: `${a} + ${b} = ?` };
  }

  // ─── Subtraction ──────────────────────────────────────────────────────────

  generateSubtraction(level = 3): Problem {
    let a: number;
    let b: number;

    switch (level) {
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
        // 1–1000, 10er borrow
        b = this.randomInt(1, 9);
        const ones5 = this.randomInt(0, b - 1);
        const tens5 = this.randomInt(1, 100);
        a = tens5 * 10 + ones5;
        break;
      }
      case 6:
      default: {
        // 1–1000, >10er borrow
        b = this.randomInt(10, 200);
        a = this.randomInt(b + 1, 1000);
        if ((a % 10) >= (b % 10) && b % 10 > 0) {
          a = Math.floor(a / 10) * 10 + this.randomInt(0, (b % 10) - 1);
        }
        if (a - b < 1) a = b + 1;
        break;
      }
    }

    const answer = a - b;
    return { operandA: a, operandB: b, answer, operation: 'subtraction', symbol: '−', text: `${a} − ${b} = ?` };
  }

  // ─── Multiplication ───────────────────────────────────────────────────────

  generateMultiplication(levelOrAllowed: number | Set<number> = 2): Problem {
    let a: number;
    let b: number;

    // Legacy path: Set<number> passed (BalloonPop, old callers)
    if (levelOrAllowed instanceof Set) {
      const numbers = Array.from(levelOrAllowed);
      a = this.randomInt(1, 10);
      b = numbers.length > 0 ? numbers[Math.floor(Math.random() * numbers.length)] : this.randomInt(1, 10);
    } else {
      const level = levelOrAllowed;
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

  generateDivision(levelOrAllowed: number | Set<number> = 2): Problem {
    let b: number;
    let maxQuotient: number;

    // Legacy path: Set<number> passed
    if (levelOrAllowed instanceof Set) {
      const numbers = Array.from(levelOrAllowed);
      b = numbers.length > 0 ? numbers[Math.floor(Math.random() * numbers.length)] : this.randomInt(1, 10);
      maxQuotient = 10;
    } else {
      const level = levelOrAllowed;
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
   * Generate a random problem of the specified types.
   * levels: per-type level map — defaults to level 2/3 if not provided.
   * allowedNumbers: legacy Set<number> filter for ×/÷ (kept for BalloonPop compatibility).
   * maxValue: optional cap on operands (inclusive). Problems where any operand exceeds
   *           maxValue are re-generated (up to 50 retries, then level 1 is used as fallback).
   */
  generateProblem(
    types: OperationType[],
    allowedNumbers?: Set<number>,
    levels?: Partial<Record<OperationType, number>>,
    maxValue?: number
  ): Problem {
    const type = types[Math.floor(Math.random() * types.length)];

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
              : maxValue && maxValue <= 100
                ? Math.min(levels?.multiplication ?? 2, 2)
                : (levels?.multiplication ?? 2);
          return this.generateMultiplication(multLevel);
        }
        case 'division': {
          // Within Zahlenraum ≤ 100: restrict divisor range so dividend stays in range (level 2)
          const divLevel =
            allowedNumbers && allowedNumbers.size > 0
              ? allowedNumbers
              : maxValue && maxValue <= 100
                ? Math.min(levels?.division ?? 2, 2)
                : (levels?.division ?? 2);
          return this.generateDivision(divLevel);
        }
      }
    };

    if (!maxValue) {
      return generate();
    }

    // Retry loop: for multiplication/division cap the result (answer), for others cap operands
    for (let attempt = 0; attempt < 50; attempt++) {
      const problem = generate();
      const withinRange =
        problem.operation === 'multiplication'
          ? problem.answer <= maxValue
          : problem.operandA <= maxValue && problem.operandB <= maxValue;
      if (withinRange) {
        return problem;
      }
    }

    // Fallback: level 1 guarantees small numbers
    switch (type) {
      case 'addition':    return this.generateAddition(1);
      case 'subtraction': return this.generateSubtraction(1);
      case 'multiplication': return this.generateMultiplication(1);
      case 'division':    return this.generateDivision(1);
    }
  }
}
