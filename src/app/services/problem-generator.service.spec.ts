import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProblemGeneratorService } from './problem-generator.service';

const RUNS = 100; // repetitions for statistical tests
const EXACT = { exact: true as const };

describe('ProblemGeneratorService', () => {
  let service: ProblemGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ProblemGeneratorService],
    });
    service = TestBed.inject(ProblemGeneratorService);
  });

  // ─── randomInt ──────────────────────────────────────────────

  describe('randomInt', () => {
    it('should return a number within range (inclusive)', () => {
      for (let i = 0; i < RUNS; i++) {
        const result = service.randomInt(1, 5);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(5);
      }
    });

    it('should return min when min === max', () => {
      expect(service.randomInt(7, 7)).toBe(7);
    });

    it('should return min when max < min', () => {
      expect(service.randomInt(5, 3)).toBe(5);
    });
  });

  // ─── pickEffectiveLevel ─────────────────────────────────────

  describe('pickEffectiveLevel', () => {
    beforeEach(() => service.resetMixCounters());

    it('exact mode always returns the requested level', () => {
      for (let level = 1; level <= 6; level++) {
        expect(service.pickEffectiveLevel(level, true)).toBe(level);
      }
    });

    it('level 1 never goes below 1', () => {
      for (let i = 0; i < RUNS; i++) {
        expect(service.pickEffectiveLevel(1)).toBe(1);
      }
    });

    it('every 5th call is a lower-level review (20%)', () => {
      const levels: number[] = [];
      for (let i = 0; i < 10; i++) {
        levels.push(service.pickEffectiveLevel(4, false, 'default'));
      }
      // Calls 5 and 10 are reviews — at most 2 below → levels 2–3
      expect(levels[4]).toBeGreaterThanOrEqual(2);
      expect(levels[4]).toBeLessThan(4);
      expect(levels[9]).toBeGreaterThanOrEqual(2);
      expect(levels[9]).toBeLessThan(4);
      // Other calls stay at current
      expect(levels.filter((l) => l === 4).length).toBe(8);
    });

    it('review pool is at most 2 levels below (e.g. Drache → 4–5)', () => {
      for (let i = 0; i < 50; i++) {
        const effective = service.pickEffectiveLevel(6, false, 'default');
        expect(effective).toBeGreaterThanOrEqual(1);
        expect(effective).toBeLessThanOrEqual(6);
        if ((i + 1) % 5 === 0) {
          expect(effective).toBeGreaterThanOrEqual(4);
          expect(effective).toBeLessThanOrEqual(5);
        } else {
          expect(effective).toBe(6);
        }
      }
    });

    it('addSub uses the same ±2 review window', () => {
      for (let i = 0; i < 25; i++) {
        const effective = service.pickEffectiveLevel(5, false, 'addSub');
        if ((i + 1) % 5 === 0) {
          expect(effective).toBeGreaterThanOrEqual(3);
          expect(effective).toBeLessThanOrEqual(4);
        } else {
          expect(effective).toBe(5);
        }
      }
    });
  });

  // ─── generateAddition ──────────────────────────────────────

  describe('generateAddition', () => {
    it('should return valid problem metadata', () => {
      const p = service.generateAddition(3, EXACT);
      expect(p.operation).toBe('addition');
      expect(p.symbol).toBe('+');
      expect(p.answer).toBe(p.operandA + p.operandB);
      expect(p.text).toContain('+');
      expect(p.text).toContain('= ?');
    });

    it('level 1: result ≤ 10, both operands ≥ 1', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateAddition(1, EXACT);
        expect(p.operandA).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeGreaterThanOrEqual(1);
        expect(p.answer).toBeLessThanOrEqual(10);
      }
    });

    it('level 2: no carry (ones do not cross decade), result ≤ 100', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateAddition(2, EXACT);
        expect(p.answer).toBeLessThanOrEqual(100);
        expect(p.operandA).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeGreaterThanOrEqual(1);
      }
    });

    it('level 3: answer correct and result ≤ 100', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateAddition(3, EXACT);
        expect(p.answer).toBe(p.operandA + p.operandB);
        expect(p.answer).toBeLessThanOrEqual(100);
      }
    });

    it('level 4: result ≤ 100, both operands ≥ 1', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateAddition(4, EXACT);
        expect(p.answer).toBeLessThanOrEqual(100);
        expect(p.operandA).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeGreaterThanOrEqual(1);
      }
    });

    it('level 5 Löwe: hundreds only, operands ≥ 100, result ≤ 999', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateAddition(5, EXACT);
        expect(p.operandA % 100).toBe(0);
        expect(p.operandB % 100).toBe(0);
        expect(p.operandA).toBeGreaterThanOrEqual(100);
        expect(p.operandB).toBeGreaterThanOrEqual(100);
        expect(p.answer).toBeLessThanOrEqual(ProblemGeneratorService.MAX_ANSWER);
        expect(p.answer).toBeGreaterThanOrEqual(200);
        expect(p.answer).toBe(p.operandA + p.operandB);
      }
    });

    it('level 6 Drache: ones digit 0, operands ≥ 100, result ≤ 999', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateAddition(6, EXACT);
        expect(p.operandA % 10).toBe(0);
        expect(p.operandB % 10).toBe(0);
        expect(p.operandA).toBeGreaterThanOrEqual(100);
        expect(p.operandB).toBeGreaterThanOrEqual(100);
        expect(p.answer).toBeLessThanOrEqual(ProblemGeneratorService.MAX_ANSWER);
        expect(p.answer).toBe(p.operandA + p.operandB);
      }
    });

    it('mix at level 6: answers stay enterable (≤ 999)', () => {
      service.resetMixCounters();
      for (let i = 0; i < 20; i++) {
        const p = service.generateAddition(6);
        expect(p.answer).toBeLessThanOrEqual(ProblemGeneratorService.MAX_ANSWER);
        expect(p.answer).toBe(p.operandA + p.operandB);
      }
    });
  });

  // ─── generateSubtraction ───────────────────────────────────

  describe('generateSubtraction', () => {
    it('should return valid problem metadata', () => {
      const p = service.generateSubtraction(3, EXACT);
      expect(p.operation).toBe('subtraction');
      expect(p.symbol).toBe('−');
      expect(p.answer).toBe(p.operandA - p.operandB);
    });

    it('level 1: result ≥ 0, operands 1–10', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateSubtraction(1, EXACT);
        expect(p.answer).toBeGreaterThanOrEqual(0);
        expect(p.operandA).toBeLessThanOrEqual(10);
      }
    });

    it('level 2: no borrow, result ≥ 1', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateSubtraction(2, EXACT);
        expect(p.answer).toBeGreaterThanOrEqual(1);
        expect(p.operandA).toBeLessThanOrEqual(99);
      }
    });

    it('level 3: 10er borrow (b 1–9), result ≥ 0', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateSubtraction(3, EXACT);
        expect(p.operandB).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeLessThanOrEqual(9);
        expect(p.answer).toBeGreaterThanOrEqual(0);
        // ones of a must be less than b (forcing borrow)
        expect(p.operandA % 10).toBeLessThan(p.operandB);
      }
    });

    it('level 4: b ≥ 10, result ≥ 1', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateSubtraction(4, EXACT);
        expect(p.operandB).toBeGreaterThanOrEqual(10);
        expect(p.answer).toBeGreaterThanOrEqual(1);
      }
    });

    it('level 5 Löwe: reine Hunderter ODER ohne Unterschreitung (100–999)', () => {
      let sawHundreds = false;
      let sawNoBorrow = false;
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateSubtraction(5, EXACT);
        expect(p.operandA).toBeGreaterThanOrEqual(100);
        expect(p.operandA).toBeLessThanOrEqual(ProblemGeneratorService.MAX_ANSWER);
        expect(p.operandB).toBeGreaterThanOrEqual(1);
        expect(p.answer).toBe(p.operandA - p.operandB);
        expect(p.answer).toBeGreaterThanOrEqual(0);
        expect(p.answer).toBeLessThanOrEqual(ProblemGeneratorService.MAX_ANSWER);

        const pureHundreds = p.operandA % 100 === 0 && p.operandB % 100 === 0;
        const noOnesBorrow = p.operandA % 10 >= p.operandB % 10;
        const noTensBorrow =
          Math.floor(p.operandA / 10) % 10 >= Math.floor(p.operandB / 10) % 10;
        if (pureHundreds) sawHundreds = true;
        if (noOnesBorrow && noTensBorrow) sawNoBorrow = true;
        expect(pureHundreds || (noOnesBorrow && noTensBorrow)).toBeTrue();
      }
      expect(sawHundreds || sawNoBorrow).toBeTrue();
    });

    it('level 6 Drache: Zehner- oder Hunderterunterschreitung', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateSubtraction(6, EXACT);
        expect(p.operandA % 10).toBe(0);
        expect(p.operandB % 10).toBe(0);
        expect(p.operandA).toBeGreaterThan(p.operandB);
        expect(p.answer).toBe(p.operandA - p.operandB);
        expect(p.answer).toBeLessThanOrEqual(ProblemGeneratorService.MAX_ANSWER);
        // Tens borrow (Unterschreitung): ones already 0, tens digit of a < tens of b
        const aTens = Math.floor(p.operandA / 10) % 10;
        const bTens = Math.floor(p.operandB / 10) % 10;
        expect(aTens).toBeLessThan(bTens);
      }
    });

    it('mix at level 6: result always ≥ 0 and operands sane', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateSubtraction(6);
        expect(p.answer).toBeGreaterThanOrEqual(0);
        expect(p.answer).toBe(p.operandA - p.operandB);
      }
    });
  });

  // ─── generateMultiplication ────────────────────────────────

  describe('generateMultiplication', () => {
    it('should return valid problem metadata', () => {
      const p = service.generateMultiplication(2, EXACT);
      expect(p.operation).toBe('multiplication');
      expect(p.symbol).toBe('×');
      expect(p.answer).toBe(p.operandA * p.operandB);
    });

    it('level 1: both factors 1–5', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateMultiplication(1, EXACT);
        expect(p.operandA).toBeGreaterThanOrEqual(1);
        expect(p.operandA).toBeLessThanOrEqual(5);
        expect(p.operandB).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeLessThanOrEqual(5);
      }
    });

    it('level 2: both factors 1–10', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateMultiplication(2, EXACT);
        expect(p.operandA).toBeGreaterThanOrEqual(1);
        expect(p.operandA).toBeLessThanOrEqual(10);
        expect(p.operandB).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeLessThanOrEqual(10);
      }
    });

    it('level 3: both factors 2–10 (kleines Einmaleins)', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateMultiplication(3, EXACT);
        expect(p.operandA).toBeGreaterThanOrEqual(2);
        expect(p.operandA).toBeLessThanOrEqual(10);
        expect(p.operandB).toBeGreaterThanOrEqual(2);
        expect(p.operandB).toBeLessThanOrEqual(10);
        expect(p.answer).toBeLessThanOrEqual(ProblemGeneratorService.MAX_MULT_PRODUCT_SMALL);
      }
    });

    it('level 4 Zehner: one factor 1–10, other a ten 10–50', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateMultiplication(4, EXACT);
        const factors = [p.operandA, p.operandB].sort((x, y) => x - y);
        expect(factors[0]).toBeGreaterThanOrEqual(1);
        expect(factors[0]).toBeLessThanOrEqual(10);
        expect(factors[1] % 10).toBe(0);
        expect(factors[1]).toBeGreaterThanOrEqual(10);
        expect(factors[1]).toBeLessThanOrEqual(50);
        expect(p.answer).toBeLessThanOrEqual(ProblemGeneratorService.MAX_MULT_PRODUCT_ZEHNER);
      }
    });

    it('level 5 Zehner: one factor 1–10, other a ten 10–90', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateMultiplication(5, EXACT);
        const factors = [p.operandA, p.operandB].sort((x, y) => x - y);
        expect(factors[0]).toBeGreaterThanOrEqual(1);
        expect(factors[0]).toBeLessThanOrEqual(10);
        expect(factors[1] % 10).toBe(0);
        expect(factors[1]).toBeGreaterThanOrEqual(10);
        expect(factors[1]).toBeLessThanOrEqual(90);
        expect(p.answer).toBe(p.operandA * p.operandB);
        expect(p.answer).toBeLessThanOrEqual(ProblemGeneratorService.MAX_MULT_PRODUCT_ZEHNER);
      }
    });

    it('level 6 Zehner: one factor 2–10, other a ten 20–90', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateMultiplication(6, EXACT);
        const small = Math.min(p.operandA, p.operandB);
        const tens = Math.max(p.operandA, p.operandB);
        expect(small).toBeGreaterThanOrEqual(2);
        expect(small).toBeLessThanOrEqual(10);
        expect(tens % 10).toBe(0);
        expect(tens).toBeGreaterThanOrEqual(20);
        expect(tens).toBeLessThanOrEqual(90);
        expect(p.answer).toBeLessThanOrEqual(ProblemGeneratorService.MAX_MULT_PRODUCT_ZEHNER);
      }
    });

    it('levels 1–3 stay in kleines Einmaleins (product ≤ 100)', () => {
      for (let level = 1; level <= 3; level++) {
        for (let i = 0; i < RUNS; i++) {
          const p = service.generateMultiplication(level, EXACT);
          expect(p.operandA).toBeLessThanOrEqual(10);
          expect(p.operandB).toBeLessThanOrEqual(10);
          expect(p.answer).toBeLessThanOrEqual(100);
        }
      }
    });

    it('Drache mix (±2) is Zehner-Einmaleins only (levels 4–5)', () => {
      service.resetMixCounters();
      for (let i = 0; i < 50; i++) {
        const p = service.generateMultiplication(6);
        const small = Math.min(p.operandA, p.operandB);
        const large = Math.max(p.operandA, p.operandB);
        expect(small).toBeLessThanOrEqual(10);
        expect(large % 10).toBe(0);
        expect(large).toBeGreaterThanOrEqual(10);
        expect(p.answer).toBeLessThanOrEqual(999);
      }
    });
    it('legacy: should respect Set<number> for operandB', () => {
      const allowed = new Set([2, 4, 6]);
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateMultiplication(allowed);
        expect(allowed.has(p.operandB)).toBeTrue();
      }
    });

    it('legacy: should work with empty Set', () => {
      const p = service.generateMultiplication(new Set());
      expect(p.answer).toBe(p.operandA * p.operandB);
    });
  });

  // ─── generateDivision ──────────────────────────────────────

  describe('generateDivision', () => {
    it('should return valid whole-number division problem', () => {
      const p = service.generateDivision(2, EXACT);
      expect(p.operation).toBe('division');
      expect(p.symbol).toBe('÷');
      expect(Number.isInteger(p.answer)).toBeTrue();
      expect(p.operandA).toBe(p.operandB * p.answer);
    });

    it('level 1 Maus: divisor & quotient 1–5, dividend ≤ 25', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateDivision(1, EXACT);
        expect(p.operandB).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeLessThanOrEqual(5);
        expect(p.answer).toBeGreaterThanOrEqual(1);
        expect(p.answer).toBeLessThanOrEqual(5);
        expect(p.operandA).toBe(p.operandB * p.answer);
        expect(p.operandA).toBeLessThanOrEqual(25);
      }
    });

    it('level 2 Fuchs: divisor & quotient 1–10, dividend ≤ 100', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateDivision(2, EXACT);
        expect(p.operandB).toBeLessThanOrEqual(10);
        expect(p.answer).toBeLessThanOrEqual(10);
        expect(p.operandA).toBeLessThanOrEqual(100);
        expect(p.operandA).toBe(p.operandB * p.answer);
      }
    });

    it('level 3 Wolf: divisor & quotient 2–10, dividend ≤ 100', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateDivision(3, EXACT);
        expect(p.operandB).toBeGreaterThanOrEqual(2);
        expect(p.operandB).toBeLessThanOrEqual(10);
        expect(p.answer).toBeGreaterThanOrEqual(2);
        expect(p.answer).toBeLessThanOrEqual(10);
        expect(p.operandA).toBeLessThanOrEqual(100);
      }
    });

    it('level 4 Adler: Zehner-Quotient 10–50, divisor 1–10, dividend …0', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateDivision(4, EXACT);
        expect(p.operandB).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeLessThanOrEqual(10);
        expect(p.answer % 10).toBe(0);
        expect(p.answer).toBeGreaterThanOrEqual(10);
        expect(p.answer).toBeLessThanOrEqual(50);
        expect(p.operandA % 10).toBe(0);
        expect(p.operandA).toBe(p.operandB * p.answer);
        expect(p.operandA).toBeLessThanOrEqual(ProblemGeneratorService.MAX_ANSWER);
      }
    });

    it('level 5 Löwe: Zehner-Quotient 10–90, divisor 1–10', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateDivision(5, EXACT);
        expect(p.operandB).toBeLessThanOrEqual(10);
        expect(p.answer % 10).toBe(0);
        expect(p.answer).toBeGreaterThanOrEqual(10);
        expect(p.answer).toBeLessThanOrEqual(90);
        expect(p.operandA % 10).toBe(0);
        expect(p.operandA).toBe(p.operandB * p.answer);
      }
    });

    it('level 6 Drache: Zehner-Quotient 20–90, divisor 2–10', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateDivision(6, EXACT);
        expect(p.operandB).toBeGreaterThanOrEqual(2);
        expect(p.operandB).toBeLessThanOrEqual(10);
        expect(p.answer % 10).toBe(0);
        expect(p.answer).toBeGreaterThanOrEqual(20);
        expect(p.answer).toBeLessThanOrEqual(90);
        expect(p.operandA).toBe(p.operandB * p.answer);
        expect(p.operandA).toBeLessThanOrEqual(ProblemGeneratorService.MAX_ANSWER);
      }
    });

    it('legacy: should respect Set<number> for divisor', () => {
      const allowed = new Set([3, 7]);
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateDivision(allowed);
        expect(allowed.has(p.operandB)).toBeTrue();
      }
    });
  });

  // ─── generateProblem ───────────────────────────────────────

  describe('generateProblem', () => {
    it('should generate the single specified type', () => {
      expect(service.generateProblem(['addition']).operation).toBe('addition');
      expect(service.generateProblem(['subtraction']).operation).toBe('subtraction');
      expect(service.generateProblem(['multiplication']).operation).toBe('multiplication');
      expect(service.generateProblem(['division']).operation).toBe('division');
    });

    it('should generate one of the specified types', () => {
      const types: ('addition' | 'subtraction')[] = ['addition', 'subtraction'];
      for (let i = 0; i < 50; i++) {
        const p = service.generateProblem(types);
        expect(types).toContain(p.operation as 'addition' | 'subtraction');
      }
    });

    it('should pass levels to generators', () => {
      // Level 1 addition: result ≤ 10 (mix at 1 stays exact)
      for (let i = 0; i < 50; i++) {
        const p = service.generateProblem(['addition'], undefined, { addition: 1 });
        expect(p.answer).toBeLessThanOrEqual(10);
      }
    });

    it('should use level for multiplication when no allowedNumbers given', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateProblem(['multiplication'], undefined, { multiplication: 1 });
        expect(p.operandA).toBeLessThanOrEqual(5);
        expect(p.operandB).toBeLessThanOrEqual(5);
      }
    });

    it('should prefer allowedNumbers over level for multiplication when set is non-empty', () => {
      const allowed = new Set([5]);
      for (let i = 0; i < 20; i++) {
        const p = service.generateProblem(['multiplication'], allowed, { multiplication: 6 });
        expect(allowed.has(p.operandB)).toBeTrue();
      }
    });

    it('should prefer allowedNumbers over level for division when set is non-empty', () => {
      const allowed = new Set([5]);
      for (let i = 0; i < 20; i++) {
        const p = service.generateProblem(['division'], allowed, { division: 4 });
        expect(allowed.has(p.operandB)).toBeTrue();
      }
    });

    it('maxValue 100 must not block Drache addition (level raises Zahlenraum to 1000)', () => {
      service.resetMixCounters();
      let foundThousand = false;
      for (let i = 0; i < 20; i++) {
        const p = service.generateProblem(['addition'], undefined, { addition: 6 }, 100);
        if (p.operandA > 100 || p.operandB > 100 || p.answer > 100) {
          foundThousand = true;
          break;
        }
      }
      expect(foundThousand).toBeTrue();
    });

    it('maxValue: operands should not exceed maxValue', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateProblem(['addition'], undefined, { addition: 3 }, 150);
        expect(p.operandA).toBeLessThanOrEqual(150);
        expect(p.operandB).toBeLessThanOrEqual(150);
      }
    });

    it('maxValue: works for subtraction', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateProblem(['subtraction'], undefined, { subtraction: 3 }, 120);
        expect(p.operandA).toBeLessThanOrEqual(120);
        expect(p.operandB).toBeLessThanOrEqual(120);
      }
    });

    it('maxValue: works for multiplication (kleines Einmaleins)', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateProblem(['multiplication'], undefined, { multiplication: 2 }, 50);
        expect(p.operandA).toBeLessThanOrEqual(10);
        expect(p.operandB).toBeLessThanOrEqual(10);
        expect(p.answer).toBeLessThanOrEqual(100); // level 2 raises cap to 100
      }
    });

    it('maxValue: works for division', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateProblem(['division'], undefined, { division: 2 }, 50);
        expect(p.operandA).toBeLessThanOrEqual(100);
        expect(p.operandB).toBeLessThanOrEqual(10);
        expect(p.answer).toBeLessThanOrEqual(ProblemGeneratorService.MAX_ANSWER);
      }
    });

    it('Zehner-Einmaleins works even with large Zahlenraum', () => {
      let foundZehner = false;
      for (let i = 0; i < 40; i++) {
        const p = service.generateProblem(['multiplication'], undefined, { multiplication: 6 }, 1000);
        const large = Math.max(p.operandA, p.operandB);
        if (large >= 20 && large % 10 === 0) {
          foundZehner = true;
          expect(p.answer).toBeLessThanOrEqual(999);
          break;
        }
      }
      expect(foundZehner).toBeTrue();
    });

    it('maxValue: fallback returns valid problem when constraint is impossible', () => {
      // maxValue of 1 is impossible for high multiplication — fallback to level 1
      const p = service.generateProblem(['multiplication'], undefined, { multiplication: 6 }, 1);
      expect(p).toBeTruthy();
      expect(p.operation).toBe('multiplication');
      expect(typeof p.answer).toBe('number');
    });

    it('no maxValue: should not restrict operands (fast path)', () => {
      // Level 6 addition (exact) produces multiples of 10 — with mix, lower levels may be small
      let foundLarge = false;
      for (let i = 0; i < RUNS * 5; i++) {
        const p = service.generateAddition(6, EXACT);
        if (p.operandA > 100 || p.operandB > 100) {
          foundLarge = true;
          break;
        }
      }
      expect(foundLarge).toBeTrue();
    });
  });
});
