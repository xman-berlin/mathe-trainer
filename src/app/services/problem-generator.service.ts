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
 * Addition (5 levels active; Drache reserved/disabled):
 *   1 — 1–10,   no carry
 *   2 — 1–100,  no carry
 *   3 — 1–100,  10er carry
 *   4 — 1–100,  >10er carry
 *   5 — reine Hunderter (…00), operands ≥ 100, result ≤ 999
 *
 * Subtraction (5 levels active; Drache reserved/disabled):
 *   1–4 — same Zahlenraum as addition (1–10 / 1–100)
 *   5 — reine Hunderter (z. B. 800−300)
 *
 * Multiplication (6 levels) — Klasse 3 progression:
 *   Festigung kleines Einmaleins (product ≤ 100):
 *     1 — 1–5  × 1–5
 *     2 — 1–10 × 1–10
 *     3 — 2–10 × 2–10
 *   Zehner-Einmaleins (one factor 1–10, other a ten 10…90, product ≤ 999):
 *     4 — 1–10 × {10,20,30,40,50}
 *     5 — 1–10 × {10,20,…,90}
 *     6 — 2–10 × {20,30,…,90}
 *
 * Division (6 levels, always whole number, no remainder) — Klasse 3:
 *   Festigung kleines Einsdurcheins (dividend & quotient ≤ 100):
 *     1 — divisor 1–5,  quotient 1–5
 *     2 — divisor 1–10, quotient 1–10
 *     3 — divisor 2–10, quotient 2–10
 *   Division mit Zehnerzahlen (dividend = Zehnerzahl, divisor einstellig):
 *     4 — divisor 1–10, quotient {10…50}  (z. B. 240 ÷ 6 = 40)
 *     5 — divisor 1–10, quotient {10…90}  (z. B. 560 ÷ 8 = 70)
 *     6 — divisor 2–10, quotient {20…90}
 *
 * Mix (default): 80% current level, 20% review from at most 2 levels below.
 */
@Injectable({
  providedIn: 'root',
})
export class ProblemGeneratorService {
  /** Probability of using the current level (vs. a random lower one). */
  static readonly CURRENT_LEVEL_WEIGHT = 0.8;

  /**
   * Max enterable answer (numeric keypad / input maxlength is 3 digits).
   * All generated answers must stay ≤ this value.
   */
  static readonly MAX_ANSWER = 999;

  /** Kleines Einmaleins: factors 1–10, product ≤ 100. */
  static readonly MAX_MULT_FACTOR = 10;
  static readonly MAX_MULT_PRODUCT_SMALL = 100;

  /** Zehner-Einmaleins: product ≤ 999 (keypad). */
  static readonly MAX_MULT_PRODUCT_ZEHNER = 999;

  /** @deprecated use MAX_MULT_PRODUCT_SMALL — kept as alias for older specs */
  static readonly MAX_MULT_PRODUCT = 100;

  /** Per-key counters so every 5th task is a lower-level review (exact 20%). */
  private readonly mixCounters = new Map<string, number>();

  // ─── Utility ─────────────────────────────────────────────────────────────

  randomInt(min: number, max: number): number {
    if (max < min) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 80% → requested level; 20% → lower-level review (every 5th call).
   * Review pool is at most **2 levels below** the current level
   * (e.g. Drache → Adler or Löwe, never Maus/Fuchs).
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

    const minReview = Math.max(1, clamped - 2);
    return this.randomInt(minReview, clamped - 1);
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
      case 5:
      case 6:
      default: {
        // Löwe (max for +/−): reine Hunderter; case 6 kept as alias while Drache is disabled
        a = this.randomInt(1, 8) * 100; // 100…800 (room for b ≥ 100)
        b = this.randomInt(1, Math.floor((ProblemGeneratorService.MAX_ANSWER - a) / 100)) * 100;
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
      case 5:
      case 6:
      default: {
        // Löwe (max for +/−): reine Hunderter only; case 6 alias while Drache is disabled
        a = this.randomInt(2, 9) * 100;
        b = this.randomInt(1, a / 100 - 1) * 100;
        break;
      }
    }

    const answer = a - b;
    return { operandA: a, operandB: b, answer, operation: 'subtraction', symbol: '−', text: `${a} − ${b} = ?` };
  }

  // ─── Multiplication ───────────────────────────────────────────────────────

  /** Random tens number from minTens…maxTens (inclusive, steps of 10). */
  private randomTens(minTens: number, maxTens: number): number {
    const min = Math.ceil(minTens / 10);
    const max = Math.floor(maxTens / 10);
    return this.randomInt(min, Math.max(min, max)) * 10;
  }

  generateMultiplication(levelOrAllowed: number | Set<number> = 2, options?: GenerateOptions): Problem {
    let a: number;
    let b: number;

    // Legacy path: Set<number> passed (BalloonPop, old callers) — kleines Einmaleins
    if (levelOrAllowed instanceof Set) {
      const numbers = Array.from(levelOrAllowed);
      a = this.randomInt(1, ProblemGeneratorService.MAX_MULT_FACTOR);
      b =
        numbers.length > 0
          ? numbers[Math.floor(Math.random() * numbers.length)]
          : this.randomInt(1, ProblemGeneratorService.MAX_MULT_FACTOR);
    } else {
      const level = this.pickEffectiveLevel(levelOrAllowed, options?.exact === true);
      switch (level) {
        // ── Festigung kleines Einmaleins (Klasse 2 / Jahresbeginn) ──
        case 1:
          a = this.randomInt(1, 5);
          b = this.randomInt(1, 5);
          break;
        case 2:
          a = this.randomInt(1, 10);
          b = this.randomInt(1, 10);
          break;
        case 3:
          a = this.randomInt(2, 10);
          b = this.randomInt(2, 10);
          break;
        // ── Zehner-Einmaleins (bis 1000, Ergebnis ≤ 999) ──
        case 4:
          // e.g. 4 × 20, 5 × 50
          a = this.randomInt(1, 10);
          b = this.randomTens(10, 50);
          break;
        case 5:
          // e.g. 7 × 80 = 560
          a = this.randomInt(1, 10);
          b = this.randomTens(10, 90);
          break;
        case 6:
        default:
          // Harder Zehner: no ×1, tens from 20
          a = this.randomInt(2, 10);
          b = this.randomTens(20, 90);
          break;
      }
      // Randomly swap so children also see 20 × 4, not only 4 × 20
      if (level >= 4 && Math.random() < 0.5) {
        const tmp = a;
        a = b;
        b = tmp;
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
    let divisor: number;
    let quotient: number;

    // Legacy path: Set<number> passed (allowed divisors) — kleines Einsdurcheins
    if (levelOrAllowed instanceof Set) {
      const numbers = Array.from(levelOrAllowed);
      divisor =
        numbers.length > 0
          ? numbers[Math.floor(Math.random() * numbers.length)]
          : this.randomInt(1, 10);
      quotient = this.randomInt(1, 10);
    } else {
      const level = this.pickEffectiveLevel(levelOrAllowed, options?.exact === true);
      switch (level) {
        // ── Festigung kleines Einsdurcheins (Dividenden & Ergebnisse ≤ 100) ──
        case 1:
          divisor = this.randomInt(1, 5);
          quotient = this.randomInt(1, 5);
          break;
        case 2:
          divisor = this.randomInt(1, 10);
          quotient = this.randomInt(1, 10);
          break;
        case 3:
          divisor = this.randomInt(2, 10);
          quotient = this.randomInt(2, 10);
          break;
        // ── Division mit Zehnerzahlen (ohne Rest) ──
        case 4:
          // z. B. 240 ÷ 6 = 40
          divisor = this.randomInt(1, 10);
          quotient = this.randomTens(10, 50);
          break;
        case 5:
          // z. B. 560 ÷ 8 = 70
          divisor = this.randomInt(1, 10);
          quotient = this.randomTens(10, 90);
          break;
        case 6:
        default:
          divisor = this.randomInt(2, 10);
          quotient = this.randomTens(20, 90);
          break;
      }
    }

    const dividend = divisor * quotient;

    return {
      operandA: dividend,
      operandB: divisor,
      answer: quotient,
      operation: 'division',
      symbol: '÷',
      text: `${dividend} ÷ ${divisor} = ?`,
    };
  }

  /**
   * Product/dividend cap so ×/÷ level patterns fit the Zahlenraum setting.
   * Levels 1–3 ≤ 100 (kleines Einmaleins / Einsdurcheins); 4–6 ≤ 999 (Zehner).
   */
  minZahlenraumForMultDiv(level: number, _operation: 'multiplication' | 'division'): number {
    return level <= 3
      ? ProblemGeneratorService.MAX_MULT_PRODUCT_SMALL
      : ProblemGeneratorService.MAX_MULT_PRODUCT_ZEHNER;
  }

  /**
   * Minimum Zahlenraum required so addition/subtraction level patterns can appear.
   * Löwe (level 5) needs 1000 even if the user setting is still 100.
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
   *           level's Zahlenraum (so Löwe is not blocked by a stale "bis 100" setting).
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

    // Difficulty level wins over a smaller Zahlenraum for +/−/÷/× (Zehner).
    const effectiveMax =
      maxValue === undefined
        ? type === 'multiplication'
          ? this.minZahlenraumForMultDiv(levelForType, 'multiplication')
          : undefined
        : type === 'addition' || type === 'subtraction'
          ? Math.max(maxValue, this.minZahlenraumForAddSub(levelForType))
          : type === 'multiplication'
            ? Math.max(
                Math.min(maxValue, ProblemGeneratorService.MAX_MULT_PRODUCT_ZEHNER),
                this.minZahlenraumForMultDiv(levelForType, 'multiplication')
              )
            : type === 'division'
              ? Math.max(maxValue, this.minZahlenraumForMultDiv(levelForType, 'division'))
              : maxValue;

    const generate = (): Problem => {
      switch (type) {
        case 'addition':
          return this.generateAddition(levels?.addition ?? 3);
        case 'subtraction':
          return this.generateSubtraction(levels?.subtraction ?? 3);
        case 'multiplication': {
          const multLevel =
            allowedNumbers && allowedNumbers.size > 0
              ? allowedNumbers
              : (levels?.multiplication ?? 2);
          return this.generateMultiplication(multLevel);
        }
        case 'division': {
          const divLevel =
            allowedNumbers && allowedNumbers.size > 0
              ? allowedNumbers
              : (levels?.division ?? 2);
          return this.generateDivision(divLevel);
        }
      }
    };

    if (!effectiveMax) {
      return generate();
    }

    // Retry loop: cap operands by Zahlenraum; always keep answer enterable (≤ 999)
    for (let attempt = 0; attempt < 50; attempt++) {
      const problem = generate();
      const answerOk = problem.answer <= ProblemGeneratorService.MAX_ANSWER;
      const withinRange =
        problem.operation === 'multiplication'
          ? problem.answer <= effectiveMax
          : problem.operation === 'division'
            ? problem.operandA <= effectiveMax
            : problem.operandA <= effectiveMax && problem.operandB <= effectiveMax;
      if (withinRange && answerOk) {
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
