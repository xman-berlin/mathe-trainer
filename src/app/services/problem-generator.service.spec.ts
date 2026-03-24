import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProblemGeneratorService } from './problem-generator.service';

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
      for (let i = 0; i < 100; i++) {
        const result = service.randomInt(1, 5);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(5);
      }
    });

    it('should return min when min === max', () => {
      expect(service.randomInt(7, 7)).toBe(7);
    });
  });

  // ─── generateAddition ──────────────────────────────────────

  describe('generateAddition', () => {
    it('should return a valid addition problem', () => {
      const problem = service.generateAddition();
      expect(problem.operation).toBe('addition');
      expect(problem.symbol).toBe('+');
      expect(problem.answer).toBe(problem.operandA + problem.operandB);
      expect(problem.text).toContain('+');
      expect(problem.text).toContain('= ?');
    });

    it('should have operandA >= 1', () => {
      for (let i = 0; i < 50; i++) {
        const p = service.generateAddition();
        expect(p.operandA).toBeGreaterThanOrEqual(1);
      }
    });

    it('should have operandB between 1 and 10', () => {
      for (let i = 0; i < 50; i++) {
        const p = service.generateAddition();
        expect(p.operandB).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeLessThanOrEqual(10);
      }
    });
  });

  // ─── generateSubtraction ───────────────────────────────────

  describe('generateSubtraction', () => {
    it('should return a valid subtraction problem', () => {
      const problem = service.generateSubtraction();
      expect(problem.operation).toBe('subtraction');
      expect(problem.symbol).toBe('−');
      expect(problem.answer).toBe(problem.operandA - problem.operandB);
      expect(problem.text).toContain('−');
      expect(problem.text).toContain('= ?');
    });

    it('should force 10s crossing (borrowing)', () => {
      for (let i = 0; i < 50; i++) {
        const p = service.generateSubtraction();
        expect(p.operandA % 10).toBeLessThan(p.operandB);
      }
    });

    it('should always have a positive result', () => {
      for (let i = 0; i < 50; i++) {
        const p = service.generateSubtraction();
        expect(p.answer).toBeGreaterThan(0);
      }
    });

    it('should have operandB between 1 and 10', () => {
      for (let i = 0; i < 50; i++) {
        const p = service.generateSubtraction();
        expect(p.operandB).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeLessThanOrEqual(10);
      }
    });
  });

  // ─── generateMultiplication ────────────────────────────────

  describe('generateMultiplication', () => {
    it('should return a valid multiplication problem', () => {
      const problem = service.generateMultiplication();
      expect(problem.operation).toBe('multiplication');
      expect(problem.symbol).toBe('×');
      expect(problem.answer).toBe(problem.operandA * problem.operandB);
      expect(problem.text).toContain('×');
      expect(problem.text).toContain('= ?');
    });

    it('should have operands between 1 and 10', () => {
      for (let i = 0; i < 50; i++) {
        const p = service.generateMultiplication();
        expect(p.operandA).toBeGreaterThanOrEqual(1);
        expect(p.operandA).toBeLessThanOrEqual(10);
        expect(p.operandB).toBeGreaterThanOrEqual(1);
        expect(p.operandB).toBeLessThanOrEqual(10);
      }
    });

    it('should respect allowedNumbers for operandB', () => {
      const allowed = new Set([2, 4, 6]);
      for (let i = 0; i < 50; i++) {
        const p = service.generateMultiplication(allowed);
        expect(allowed.has(p.operandB)).toBeTrue();
      }
    });

    it('should work with empty allowedNumbers set', () => {
      const p = service.generateMultiplication(new Set());
      expect(p.operation).toBe('multiplication');
      expect(p.answer).toBe(p.operandA * p.operandB);
    });
  });

  // ─── generateDivision ──────────────────────────────────────

  describe('generateDivision', () => {
    it('should return a valid division problem with whole number result', () => {
      const problem = service.generateDivision();
      expect(problem.operation).toBe('division');
      expect(problem.symbol).toBe('÷');
      expect(problem.answer).toBe(Math.floor(problem.operandA / problem.operandB));
      expect(Number.isInteger(problem.answer)).toBeTrue();
      expect(problem.operandA).toBe(problem.operandB * problem.answer);
      expect(problem.text).toContain('÷');
      expect(problem.text).toContain('= ?');
    });

    it('should have quotient between 1 and 10', () => {
      for (let i = 0; i < 50; i++) {
        const p = service.generateDivision();
        expect(p.answer).toBeGreaterThanOrEqual(1);
        expect(p.answer).toBeLessThanOrEqual(10);
      }
    });

    it('should respect allowedNumbers for divisor', () => {
      const allowed = new Set([3, 7]);
      for (let i = 0; i < 50; i++) {
        const p = service.generateDivision(allowed);
        expect(allowed.has(p.operandB)).toBeTrue();
      }
    });

    it('should work with empty allowedNumbers set', () => {
      const p = service.generateDivision(new Set());
      expect(p.operation).toBe('division');
      expect(Number.isInteger(p.answer)).toBeTrue();
    });
  });

  // ─── generateProblem ───────────────────────────────────────

  describe('generateProblem', () => {
    it('should generate addition when only addition type is given', () => {
      const p = service.generateProblem(['addition']);
      expect(p.operation).toBe('addition');
    });

    it('should generate subtraction when only subtraction type is given', () => {
      const p = service.generateProblem(['subtraction']);
      expect(p.operation).toBe('subtraction');
    });

    it('should generate multiplication when only multiplication type is given', () => {
      const p = service.generateProblem(['multiplication']);
      expect(p.operation).toBe('multiplication');
    });

    it('should generate division when only division type is given', () => {
      const p = service.generateProblem(['division']);
      expect(p.operation).toBe('division');
    });

    it('should generate one of the specified types', () => {
      const types: ('addition' | 'subtraction')[] = ['addition', 'subtraction'];
      for (let i = 0; i < 50; i++) {
        const p = service.generateProblem(types);
        expect(types).toContain(p.operation as 'addition' | 'subtraction');
      }
    });

    it('should pass allowedNumbers to multiplication', () => {
      const allowed = new Set([5]);
      for (let i = 0; i < 20; i++) {
        const p = service.generateProblem(['multiplication'], allowed);
        expect(allowed.has(p.operandB)).toBeTrue();
      }
    });

    it('should pass allowedNumbers to division', () => {
      const allowed = new Set([5]);
      for (let i = 0; i < 20; i++) {
        const p = service.generateProblem(['division'], allowed);
        expect(allowed.has(p.operandB)).toBeTrue();
      }
    });
  });
});
