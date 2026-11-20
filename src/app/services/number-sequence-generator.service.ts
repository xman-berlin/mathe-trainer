import { Injectable } from '@angular/core';

export type NumberSequenceKind =
  | 'arithmetic'
  | 'alternating-add'
  | 'geometric'
  | 'alternating-mul';

export interface NumberSequenceProblem {
  /** Full sequence values (including answers for gaps) */
  terms: number[];
  /** Indices that are gaps the child must fill */
  gapIndices: number[];
  /**
   * Primary step:
   * - arithmetic: signed constant difference
   * - alternating-add: first add (positive)
   * - geometric / alternating-mul: multiply/divide factor (positive)
   */
  step: number;
  /** Second operand for alternating patterns (positive) */
  stepB?: number;
  kind: NumberSequenceKind;
  level: number;
}

const MAX_ANSWER = 999;

@Injectable({ providedIn: 'root' })
export class NumberSequenceGeneratorService {
  generate(level: number): NumberSequenceProblem {
    const playerLevel = Math.min(5, Math.max(1, Math.floor(level)));
    // 80/20 review mix: sometimes one tier easier (never jump −2 — that felt like a rank drop)
    const effective =
      playerLevel > 1 && Math.random() < 0.2 ? playerLevel - 1 : playerLevel;

    for (let attempt = 0; attempt < 50; attempt++) {
      const kind = this.pickKind(effective);
      const problem =
        kind === 'arithmetic'
          ? this.tryArithmetic(effective)
          : kind === 'alternating-add'
            ? this.tryAlternatingAdd(effective)
            : kind === 'geometric'
              ? this.tryGeometric(effective)
              : this.tryAlternatingMul(effective);
      // Stamp the player's tier (not the easier review tier) so pending restore can't demote
      if (problem) return { ...problem, level: playerLevel };
    }
    // Deterministic fallback
    return {
      terms: [2, 4, 6, 8, 10],
      gapIndices: [4],
      step: 2,
      kind: 'arithmetic',
      level: playerLevel,
    };
  }

  private pickKind(level: number): NumberSequenceKind {
    const r = Math.random();
    // Levels 1–3: constant +/− only
    if (level <= 3) return 'arithmetic';
    // Level 4 (Adler): constant +/− and alternating +/−
    if (level === 4) {
      return r < 0.55 ? 'arithmetic' : 'alternating-add';
    }
    // Level 5 (Löwe): mostly +/− / Wechsel; ×/÷ only as a light spice
    if (r < 0.4) return 'arithmetic';
    if (r < 0.7) return 'alternating-add';
    if (r < 0.9) return 'geometric';
    return 'alternating-mul';
  }

  private tryArithmetic(level: number): NumberSequenceProblem | null {
    const max = this.maxForLevel(level);
    const steps = this.arithStepsForLevel(level);
    const step = steps[Math.floor(Math.random() * steps.length)];
    const length = this.lengthForLevel(level);
    const gapCount = this.gapCountForLevel(level);

    const ascending = Math.random() < 0.55;
    const signedStep = ascending ? step : -step;

    const minStart = ascending ? 1 : 1 + step * (length - 1);
    const maxStart = ascending ? max - step * (length - 1) : max;
    if (maxStart < minStart) return null;

    const start = this.randomInt(minStart, maxStart);
    const terms: number[] = [];
    for (let i = 0; i < length; i++) {
      const v = start + signedStep * i;
      if (!this.inRange(v, max)) return null;
      terms.push(v);
    }

    return this.finish(terms, gapCount, level, {
      step: signedStep,
      kind: 'arithmetic',
    });
  }

  /** Pattern: +a, −b, +a, −b, … */
  private tryAlternatingAdd(level: number): NumberSequenceProblem | null {
    const max = this.maxForLevel(level);
    const length = this.lengthForLevel(level);
    const gapCount = this.gapCountForLevel(level);
    const pairs = this.altAddPairsForLevel(level);
    const [a, b] = pairs[Math.floor(Math.random() * pairs.length)];

    // Net change over two steps: a - b
    const net = a - b;
    // Keep terms in range: estimate min/max of the zigzag
    for (let attempt = 0; attempt < 20; attempt++) {
      const start = this.randomInt(1, max);
      const terms: number[] = [start];
      let ok = true;
      for (let i = 1; i < length; i++) {
        const prev = terms[i - 1];
        const next = i % 2 === 1 ? prev + a : prev - b;
        if (!this.inRange(next, max)) {
          ok = false;
          break;
        }
        terms.push(next);
      }
      if (!ok) continue;
      // Avoid degenerate flat-ish series when a≈b and no visible zigzag
      if (net === 0 && new Set(terms).size < 2) continue;

      const finished = this.finish(terms, gapCount, level, {
        step: a,
        stepB: b,
        kind: 'alternating-add',
      });
      if (finished) return finished;
    }
    return null;
  }

  /** Pattern: ×k or ÷k (constant factor) */
  private tryGeometric(level: number): NumberSequenceProblem | null {
    const max = this.maxForLevel(level);
    // Short chains so ×10 doesn't explode into 4-digit products
    const length = Math.min(this.lengthForLevel(level), 5);
    const gapCount = Math.min(this.gapCountForLevel(level), 2);
    const factors = this.geoFactorsForLevel(level);
    const k = factors[Math.floor(Math.random() * factors.length)];
    const multiply = Math.random() < 0.55;

    if (multiply) {
      const maxStart = Math.floor(max / Math.pow(k, length - 1));
      if (maxStart < 1) return null;
      const start = this.randomInt(1, maxStart);
      const terms: number[] = [];
      for (let i = 0; i < length; i++) {
        const v = start * Math.pow(k, i);
        if (!this.inRange(v, max) || !Number.isInteger(v)) return null;
        terms.push(v);
      }
      return this.finish(terms, gapCount, level, { step: k, kind: 'geometric' });
    }

    // Descending ÷k: start must be divisible by k^(length-1)
    const minStart = Math.pow(k, length - 1);
    if (minStart > max) return null;
    const maxExp = Math.floor(Math.log(max) / Math.log(k));
    if (maxExp < length - 1) return null;
    const startExp = this.randomInt(length - 1, maxExp);
    const start = Math.pow(k, startExp);
    if (!this.inRange(start, max)) return null;

    const terms: number[] = [];
    for (let i = 0; i < length; i++) {
      const v = start / Math.pow(k, i);
      if (!this.inRange(v, max) || !Number.isInteger(v)) return null;
      terms.push(v);
    }
    return this.finish(terms, gapCount, level, { step: k, kind: 'geometric' });
  }

  /** Pattern: ×a, ÷b, ×a, ÷b, … (exact integers) */
  private tryAlternatingMul(level: number): NumberSequenceProblem | null {
    const max = this.maxForLevel(level);
    const length = Math.min(this.lengthForLevel(level), 6);
    const gapCount = Math.min(this.gapCountForLevel(level), 2);
    const pairs = this.altMulPairsForLevel(level);
    const [a, b] = pairs[Math.floor(Math.random() * pairs.length)];

    for (let attempt = 0; attempt < 30; attempt++) {
      // Choose start so every ÷b lands on an integer
      const start = this.randomInt(1, Math.min(max, 50));
      const terms: number[] = [start];
      let ok = true;
      for (let i = 1; i < length; i++) {
        const prev = terms[i - 1];
        let next: number;
        if (i % 2 === 1) {
          next = prev * a;
        } else {
          if (prev % b !== 0) {
            ok = false;
            break;
          }
          next = prev / b;
        }
        if (!this.inRange(next, max) || !Number.isInteger(next)) {
          ok = false;
          break;
        }
        terms.push(next);
      }
      if (!ok) continue;
      if (new Set(terms).size < 2) continue;

      const finished = this.finish(terms, gapCount, level, {
        step: a,
        stepB: b,
        kind: 'alternating-mul',
      });
      if (finished) return finished;
    }
    return null;
  }

  private finish(
    terms: number[],
    gapCount: number,
    level: number,
    meta: Pick<NumberSequenceProblem, 'step' | 'stepB' | 'kind'>
  ): NumberSequenceProblem | null {
    const gapIndices = this.pickGapIndices(terms.length, gapCount, level);
    if (!gapIndices || !this.isUnambiguous(terms, gapIndices, meta)) {
      return null;
    }
    return { terms, gapIndices, level, ...meta };
  }

  private inRange(v: number, max: number): boolean {
    return Number.isInteger(v) && v >= 1 && v <= max && v <= MAX_ANSWER;
  }

  private maxForLevel(level: number): number {
    if (level <= 1) return 20;
    if (level <= 3) return 100;
    return 1000;
  }

  private arithStepsForLevel(level: number): number[] {
    switch (level) {
      case 1:
        return [1, 2];
      case 2:
        return [1, 2, 5, 10];
      case 3:
        return [2, 5, 10, 20];
      case 4:
        return [10, 20, 50, 100];
      case 5:
      default:
        // Milder than before (no 200er jumps) — Klasse 3 friendly
        return [10, 20, 25, 50, 100];
    }
  }

  private altAddPairsForLevel(level: number): [number, number][] {
    if (level <= 3) {
      return [
        [2, 1],
        [3, 1],
        [5, 2],
        [5, 1],
        [10, 5],
        [10, 2],
      ];
    }
    if (level === 4) {
      return [
        [10, 5],
        [20, 10],
        [10, 2],
        [15, 5],
        [20, 5],
        [25, 5],
      ];
    }
    // Löwe: same ballpark as Adler, slightly larger steps only
    return [
      [20, 10],
      [25, 5],
      [30, 10],
      [40, 10],
      [50, 25],
      [20, 5],
    ];
  }

  private geoFactorsForLevel(_level: number): number[] {
    // Keep ×2 / ×5 / ×10 only — no ×3/×4 (too hard for Klasse 3)
    return [2, 5, 10];
  }

  private altMulPairsForLevel(_level: number): [number, number][] {
    // Oscillating doubles/fives/tens; avoid awkward ×3÷2 style
    return [
      [2, 2],
      [5, 5],
      [10, 10],
      [2, 4],
      [4, 2],
      [10, 2],
    ];
  }

  private lengthForLevel(level: number): number {
    if (level <= 2) return 5;
    return this.randomInt(5, 6);
  }

  private gapCountForLevel(level: number): number {
    if (level <= 2) return 1;
    if (level === 3) return Math.random() < 0.55 ? 1 : 2;
    if (level === 4) return Math.random() < 0.4 ? 1 : 2;
    // Löwe: mostly 1–2 gaps; 3 only rarely
    const r = Math.random();
    if (r < 0.45) return 1;
    if (r < 0.9) return 2;
    return 3;
  }

  /**
   * Prefer pedagogical gap placements; always leave ≥2 visible anchors.
   */
  private pickGapIndices(length: number, gapCount: number, level: number): number[] | null {
    if (gapCount >= length - 1) return null;
    const maxGaps = Math.min(gapCount, length - 2);
    if (maxGaps < 1) return null;

    if (maxGaps === 1) {
      if (level <= 1 || Math.random() < 0.55) return [length - 1];
      return [this.randomInt(1, length - 2)];
    }

    if (maxGaps === 2) {
      const candidates: number[][] = [
        [length - 2, length - 1],
        [1, length - 1],
        [2, length - 1],
      ];
      if (length >= 6) candidates.push([1, 3], [2, 4]);
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      return [...new Set(pick)].sort((a, b) => a - b);
    }

    if (length < 6) return null;
    const pattern = [0, 2, 4];
    const alt = [1, 3, 5];
    return (Math.random() < 0.5 ? pattern : alt).filter((i) => i < length);
  }

  private isUnambiguous(
    terms: number[],
    gapIndices: number[],
    meta: Pick<NumberSequenceProblem, 'step' | 'stepB' | 'kind'>
  ): boolean {
    const gaps = new Set(gapIndices);
    const visible = terms
      .map((v, i) => ({ v, i }))
      .filter((t) => !gaps.has(t.i));
    if (visible.length < 2) return false;

    const adjacentPairs: { i: number; from: number; to: number }[] = [];
    for (let i = 0; i < terms.length - 1; i++) {
      if (!gaps.has(i) && !gaps.has(i + 1)) {
        adjacentPairs.push({ i, from: terms[i], to: terms[i + 1] });
      }
    }

    if (meta.kind === 'arithmetic') {
      const step = meta.step;
      if (adjacentPairs.some((p) => p.to - p.from === step)) return true;
      for (let a = 0; a < visible.length; a++) {
        for (let b = a + 1; b < visible.length; b++) {
          const di = visible[b].i - visible[a].i;
          if (di > 0 && visible[b].v - visible[a].v === step * di) return true;
        }
      }
      return false;
    }

    if (meta.kind === 'alternating-add') {
      const a = meta.step;
      const b = meta.stepB ?? 0;
      if (b <= 0) return false;
      const seenOdd = adjacentPairs.some((p) => p.i % 2 === 0 && p.to - p.from === a);
      const seenEven = adjacentPairs.some((p) => p.i % 2 === 1 && p.from - p.to === b);
      if (seenOdd && seenEven) return true;
      // One full visible triple reveals both steps
      for (let i = 0; i < terms.length - 2; i++) {
        if (!gaps.has(i) && !gaps.has(i + 1) && !gaps.has(i + 2)) {
          const d1 = terms[i + 1] - terms[i];
          const d2 = terms[i + 2] - terms[i + 1];
          if (i % 2 === 0 && d1 === a && d2 === -b) return true;
          if (i % 2 === 1 && d1 === -b && d2 === a) return true;
        }
      }
      return false;
    }

    if (meta.kind === 'geometric') {
      const k = meta.step;
      return adjacentPairs.some(
        (p) => p.to === p.from * k || (p.from === p.to * k && p.from % k === 0)
      );
    }

    // alternating-mul
    const a = meta.step;
    const b = meta.stepB ?? 0;
    if (b <= 0) return false;
    const seenMul = adjacentPairs.some((p) => p.i % 2 === 0 && p.to === p.from * a);
    const seenDiv = adjacentPairs.some(
      (p) => p.i % 2 === 1 && p.from === p.to * b && p.from % b === 0
    );
    if (seenMul && seenDiv) return true;
    for (let i = 0; i < terms.length - 2; i++) {
      if (!gaps.has(i) && !gaps.has(i + 1) && !gaps.has(i + 2)) {
        if (i % 2 === 0 && terms[i + 1] === terms[i] * a && terms[i + 1] === terms[i + 2] * b) {
          return true;
        }
        if (i % 2 === 1 && terms[i] === terms[i + 1] * b && terms[i + 2] === terms[i + 1] * a) {
          return true;
        }
      }
    }
    return false;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
