import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProblemGeneratorService } from './problem-generator.service';

const RUNS = 100; // repetitions for statistical tests

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

  // ─── generateAddition ──────────────────────────────────────

  describe('generateAddition', () => {
    it('should return valid problem metadata', () => {
      const p = service.generateAddition(3);
      expect(p.operation).toBe('addition');
      expect(p.symbol).toBe('+');
      expect(p.answer).toBe(p.operandA + p.operandB);
      expect(p.text).toContain('+');
      expect(p.text).toContain('= ?');
    });

    it('level 1: result ≤ 10, both operands ≥ 1', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateAddition(1);
        expect(p.operandA).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeGreaterThanOrEqual(1);
        expect(p.answer).toBeLessThanOrEqual(10);
      }
    });

    it('level 2: no carry (ones do not cross decade), result ≤ 100', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateAddition(2);
        expect(p.answer).toBeLessThanOrEqual(100);
        expect(p.operandA).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeGreaterThanOrEqual(1);
      }
    });

    it('level 3: answer correct and result ≤ 100', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateAddition(3);
        expect(p.answer).toBe(p.operandA + p.operandB);
        expect(p.answer).toBeLessThanOrEqual(100);
      }
    });

    it('level 4: result ≤ 100, both operands ≥ 1', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateAddition(4);
        expect(p.answer).toBeLessThanOrEqual(100);
        expect(p.operandA).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeGreaterThanOrEqual(1);
      }
    });

    it('level 5: result ≤ 1000', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateAddition(5);
        expect(p.answer).toBeLessThanOrEqual(1000);
        expect(p.operandA).toBeGreaterThanOrEqual(1);
      }
    });

    it('level 6: result ≤ 1000', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateAddition(6);
        expect(p.answer).toBeLessThanOrEqual(1000);
        expect(p.operandA).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ─── generateSubtraction ───────────────────────────────────

  describe('generateSubtraction', () => {
    it('should return valid problem metadata', () => {
      const p = service.generateSubtraction(3);
      expect(p.operation).toBe('subtraction');
      expect(p.symbol).toBe('−');
      expect(p.answer).toBe(p.operandA - p.operandB);
    });

    it('level 1: result ≥ 0, operands 1–10', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateSubtraction(1);
        expect(p.answer).toBeGreaterThanOrEqual(0);
        expect(p.operandA).toBeLessThanOrEqual(10);
      }
    });

    it('level 2: no borrow, result ≥ 1', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateSubtraction(2);
        expect(p.answer).toBeGreaterThanOrEqual(1);
        expect(p.operandA).toBeLessThanOrEqual(99);
      }
    });

    it('level 3: 10er borrow (b 1–9), result ≥ 0', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateSubtraction(3);
        expect(p.operandB).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeLessThanOrEqual(9);
        expect(p.answer).toBeGreaterThanOrEqual(0);
        // ones of a must be less than b (forcing borrow)
        expect(p.operandA % 10).toBeLessThan(p.operandB);
      }
    });

    it('level 4: b ≥ 10, result ≥ 1', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateSubtraction(4);
        expect(p.operandB).toBeGreaterThanOrEqual(10);
        expect(p.answer).toBeGreaterThanOrEqual(1);
      }
    });

    it('level 5: 10er borrow in 1–1000 range, result ≥ 0', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateSubtraction(5);
        expect(p.operandA % 10).toBeLessThan(p.operandB);
        expect(p.answer).toBeGreaterThanOrEqual(0);
      }
    });

    it('level 6: b ≥ 10 in 1–1000 range, result ≥ 1', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateSubtraction(6);
        expect(p.operandB).toBeGreaterThanOrEqual(10);
        expect(p.answer).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ─── generateMultiplication ────────────────────────────────

  describe('generateMultiplication', () => {
    it('should return valid problem metadata', () => {
      const p = service.generateMultiplication(2);
      expect(p.operation).toBe('multiplication');
      expect(p.symbol).toBe('×');
      expect(p.answer).toBe(p.operandA * p.operandB);
    });

    it('level 1: both factors 1–5', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateMultiplication(1);
        expect(p.operandA).toBeGreaterThanOrEqual(1);
        expect(p.operandA).toBeLessThanOrEqual(5);
        expect(p.operandB).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeLessThanOrEqual(5);
      }
    });

    it('level 2: both factors 1–10', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateMultiplication(2);
        expect(p.operandA).toBeGreaterThanOrEqual(1);
        expect(p.operandA).toBeLessThanOrEqual(10);
        expect(p.operandB).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeLessThanOrEqual(10);
      }
    });

    it('level 3: a 1–10, b 11–20', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateMultiplication(3);
        expect(p.operandA).toBeLessThanOrEqual(10);
        expect(p.operandB).toBeGreaterThanOrEqual(11);
        expect(p.operandB).toBeLessThanOrEqual(20);
      }
    });

    it('level 4: both factors 11–20', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateMultiplication(4);
        expect(p.operandA).toBeGreaterThanOrEqual(11);
        expect(p.operandA).toBeLessThanOrEqual(20);
        expect(p.operandB).toBeGreaterThanOrEqual(11);
        expect(p.operandB).toBeLessThanOrEqual(20);
      }
    });

    it('level 5: a 1–10, b 1–100', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateMultiplication(5);
        expect(p.operandA).toBeLessThanOrEqual(10);
        expect(p.operandB).toBeLessThanOrEqual(100);
      }
    });

    it('level 6: both factors 11–100', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateMultiplication(6);
        expect(p.operandA).toBeGreaterThanOrEqual(11);
        expect(p.operandA).toBeLessThanOrEqual(100);
        expect(p.operandB).toBeGreaterThanOrEqual(11);
        expect(p.operandB).toBeLessThanOrEqual(100);
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
      const p = service.generateDivision(2);
      expect(p.operation).toBe('division');
      expect(p.symbol).toBe('÷');
      expect(Number.isInteger(p.answer)).toBeTrue();
      expect(p.operandA).toBe(p.operandB * p.answer);
    });

    it('level 1: dividend ≤ 25, divisor 1–5', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateDivision(1);
        expect(p.operandA).toBeLessThanOrEqual(25);
        expect(p.operandB).toBeLessThanOrEqual(5);
        expect(p.answer).toBeGreaterThanOrEqual(1);
      }
    });

    it('level 2: dividend ≤ 100, divisor 1–10', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateDivision(2);
        expect(p.operandA).toBeLessThanOrEqual(100);
        expect(p.operandB).toBeLessThanOrEqual(10);
        expect(p.answer).toBeGreaterThanOrEqual(1);
      }
    });

    it('level 3: dividend ≤ 200, divisor 1–10', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateDivision(3);
        expect(p.operandA).toBeLessThanOrEqual(200);
        expect(p.operandB).toBeLessThanOrEqual(10);
      }
    });

    it('level 4: dividend ≤ 1000, divisor 1–10', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateDivision(4);
        expect(p.operandA).toBeLessThanOrEqual(1000);
        expect(p.operandB).toBeLessThanOrEqual(10);
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
      // Level 1 addition: result ≤ 10
      for (let i = 0; i < 50; i++) {
        const p = service.generateProblem(['addition'], undefined, { addition: 1 });
        expect(p.answer).toBeLessThanOrEqual(10);
      }
    });

    it('should use level for multiplication when no allowedNumbers given', () => {
      // Level 1 multiplication: both factors 1–5
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

    it('maxValue: works for multiplication', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateProblem(['multiplication'], undefined, { multiplication: 2 }, 50);
        expect(p.operandA).toBeLessThanOrEqual(50);
        expect(p.operandB).toBeLessThanOrEqual(50);
      }
    });

    it('maxValue: works for division', () => {
      for (let i = 0; i < RUNS; i++) {
        const p = service.generateProblem(['division'], undefined, { division: 2 }, 50);
        expect(p.operandA).toBeLessThanOrEqual(50);
        expect(p.operandB).toBeLessThanOrEqual(50);
      }
    });

    it('maxValue: fallback returns valid problem when constraint is impossible', () => {
      // maxValue of 1 is impossible for most levels — fallback to level 1
      const p = service.generateProblem(['addition'], undefined, { addition: 6 }, 1);
      expect(p).toBeTruthy();
      expect(p.operation).toBe('addition');
      expect(typeof p.answer).toBe('number');
    });

    it('no maxValue: should not restrict operands (fast path)', () => {
      // Level 6 addition can produce large numbers — with no maxValue they are allowed
      let foundLarge = false;
      for (let i = 0; i < RUNS * 5; i++) {
        const p = service.generateProblem(['addition'], undefined, { addition: 6 });
        if (p.operandA > 100 || p.operandB > 100) {
          foundLarge = true;
          break;
        }
      }
      expect(foundLarge).toBeTrue();
    });
  });
});
