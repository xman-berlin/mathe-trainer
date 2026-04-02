import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { WordProblemService } from './word-problem.service';

describe('WordProblemService', () => {
  let service: WordProblemService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), WordProblemService],
    });
    service = TestBed.inject(WordProblemService);
  });

  // ─── generateProblem ────────────────────────────────────────

  describe('generateProblem', () => {
    it('should return a valid WordProblem for addition', () => {
      const problem = service.generateProblem('addition', 'bis20');
      expect(problem.type).toBe('addition');
      expect(problem.storyText).toBeTruthy();
      expect(problem.correctAnswer).toBe(problem.operandA + problem.operandB);
      expect(problem.templateId).toBeTruthy();
      expect(problem.numberRange).toBe('bis20');
    });

    it('should return a valid WordProblem for subtraction', () => {
      const problem = service.generateProblem('subtraction', 'bis20');
      expect(problem.type).toBe('subtraction');
      expect(problem.correctAnswer).toBe(problem.operandA - problem.operandB);
    });

    it('should return a valid WordProblem for multiplication', () => {
      const problem = service.generateProblem('multiplication', 'bis100');
      expect(problem.type).toBe('multiplication');
      expect(problem.correctAnswer).toBe(problem.operandA * problem.operandB);
    });

    it('should return a valid WordProblem for division', () => {
      const problem = service.generateProblem('division', 'bis100');
      expect(problem.type).toBe('division');
      expect(problem.correctAnswer).toBe(problem.operandA / problem.operandB);
      expect(Number.isInteger(problem.correctAnswer)).toBeTrue();
    });

    it('should insert operand values into story text', () => {
      const problem = service.generateProblem('addition', 'bis20');
      expect(problem.storyText).toContain(problem.operandA.toString());
      expect(problem.storyText).toContain(problem.operandB.toString());
      expect(problem.storyText).not.toContain('{a}');
      expect(problem.storyText).not.toContain('{b}');
    });

    it('should generate problems within bis20 range for addition', () => {
      for (let i = 0; i < 20; i++) {
        const problem = service.generateProblem('addition', 'bis20');
        expect(problem.operandA).toBeGreaterThan(0);
        expect(problem.operandB).toBeGreaterThan(0);
        expect(problem.correctAnswer).toBeLessThanOrEqual(19);
      }
    });

    it('should generate problems within bis100 range for addition', () => {
      for (let i = 0; i < 20; i++) {
        const problem = service.generateProblem('addition', 'bis100');
        expect(problem.operandA).toBeGreaterThan(0);
        expect(problem.operandB).toBeGreaterThan(0);
        // Zehnerübergang may produce results slightly above 100
        expect(problem.correctAnswer).toBeLessThanOrEqual(110);
      }
    });

    it('should generate subtraction problems with non-negative results', () => {
      for (let i = 0; i < 20; i++) {
        const problem = service.generateProblem('subtraction', 'bis100');
        expect(problem.correctAnswer).toBeGreaterThanOrEqual(0);
      }
    });

    it('should generate multiplication problems within bis20 range', () => {
      for (let i = 0; i < 20; i++) {
        const problem = service.generateProblem('multiplication', 'bis20');
        expect(problem.correctAnswer).toBeLessThanOrEqual(20);
      }
    });

    it('should generate multiplication problems within bis100 range', () => {
      for (let i = 0; i < 20; i++) {
        const problem = service.generateProblem('multiplication', 'bis100');
        expect(problem.correctAnswer).toBeLessThanOrEqual(100);
      }
    });

    it('should generate division problems within bis100 range', () => {
      for (let i = 0; i < 20; i++) {
        const problem = service.generateProblem('division', 'bis100');
        expect(problem.correctAnswer).toBeLessThanOrEqual(100);
        expect(Number.isInteger(problem.correctAnswer)).toBeTrue();
      }
    });
  });

  // ─── getTemplateIcon ────────────────────────────────────────

  describe('getTemplateIcon', () => {
    it('should return correct icon for known template', () => {
      expect(service.getTemplateIcon('apples')).toBe('🍎');
      expect(service.getTemplateIcon('marbles')).toBe('⚫');
      expect(service.getTemplateIcon('books')).toBe('📚');
      expect(service.getTemplateIcon('stickers')).toBe('⭐');
      expect(service.getTemplateIcon('cookies')).toBe('🍪');
      expect(service.getTemplateIcon('cars')).toBe('🚗');
      expect(service.getTemplateIcon('flowers')).toBe('🌸');
      expect(service.getTemplateIcon('candies')).toBe('🍬');
    });

    it('should return fallback icon for unknown template', () => {
      expect(service.getTemplateIcon('unknown')).toBe('📝');
    });
  });

  // ─── Recent problem deduplication ───────────────────────────

  describe('recent problem deduplication', () => {
    it('should not generate identical problems on consecutive calls (probabilistic)', () => {
      // Generate many problems and verify template IDs vary
      const problems: string[] = [];
      for (let i = 0; i < 20; i++) {
        const p = service.generateProblem('addition', 'bis20');
        problems.push(p.templateId);
      }
      const uniqueTemplates = new Set(problems);
      // At least 2 different templates should appear in 20 generations
      expect(uniqueTemplates.size).toBeGreaterThanOrEqual(2);
    });
  });
});
