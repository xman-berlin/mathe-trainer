import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SequenceService } from './sequence.service';

describe('SequenceService', () => {
  let service: SequenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(SequenceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return 7 weekdays', () => {
    const days = service.getWeekdays();
    expect(days.length).toBe(7);
    expect(days[0].name).toBe('Montag');
    expect(days[6].name).toBe('Sonntag');
  });

  it('should return 12 months', () => {
    const months = service.getMonths();
    expect(months.length).toBe(12);
    expect(months[0].name).toBe('Januar');
    expect(months[11].name).toBe('Dezember');
  });

  describe('generateQuestion for weekdays', () => {
    it('should generate a valid question with 4 options', () => {
      const q = service.generateQuestion('weekdays');
      expect(q.question).toBeTruthy();
      expect(q.options.length).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
    });

    it('should include the correct answer among the options', () => {
      const q = service.generateQuestion('weekdays');
      expect(q.options[q.correctIndex]).toBeTruthy();
    });

    it('should generate all 4 question types over multiple calls', () => {
      const types = new Set<number>();
      for (let i = 0; i < 50; i++) {
        types.add(service.generateQuestion('weekdays').questionType);
      }
      expect(types.has(1)).toBeTrue();
      expect(types.has(2)).toBeTrue();
      expect(types.has(3)).toBeTrue();
      expect(types.has(4)).toBeTrue();
    });
  });

  describe('generateQuestion for months', () => {
    it('should generate a valid question with 4 options', () => {
      const q = service.generateQuestion('months');
      expect(q.question).toBeTruthy();
      expect(q.options.length).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
    });

    it('should include the correct answer among the options', () => {
      const q = service.generateQuestion('months');
      expect(q.options[q.correctIndex]).toBeTruthy();
    });

    it('should use correct month names in options', () => {
      const validMonths = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
      const q = service.generateQuestion('months');
      for (const opt of q.options) {
        expect(validMonths).toContain(opt);
      }
    });

    it('should use correct weekday names in options', () => {
      const validDays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag',
        'Freitag', 'Samstag', 'Sonntag'];
      const q = service.generateQuestion('weekdays');
      for (const opt of q.options) {
        expect(validDays).toContain(opt);
      }
    });
  });

  describe('before/after question type', () => {
    it('should ask about "kommt nach" or "kommt vor"', () => {
      for (let i = 0; i < 30; i++) {
        const q = service.generateQuestion('weekdays');
        if (q.questionType === 1) {
          expect(q.question).toMatch(/kommt (nach|vor)/);
        }
      }
    });
  });

  describe('position question type', () => {
    it('should contain "Tag der Woche" for weekdays', () => {
      for (let i = 0; i < 30; i++) {
        const q = service.generateQuestion('weekdays');
        if (q.questionType === 2) {
          expect(q.question).toContain('Tag der Woche');
        }
      }
    });

    it('should contain "Monat des Jahres" for months', () => {
      for (let i = 0; i < 30; i++) {
        const q = service.generateQuestion('months');
        if (q.questionType === 2) {
          expect(q.question).toContain('Monat des Jahres');
        }
      }
    });
  });

  describe('gap question type', () => {
    it('should contain "fehlt"', () => {
      for (let i = 0; i < 30; i++) {
        const q = service.generateQuestion('weekdays');
        if (q.questionType === 3) {
          expect(q.question).toContain('fehlt');
          expect(q.question).toContain('___');
        }
      }
    });
  });

  describe('description question type', () => {
    it('should contain "Um welchen"', () => {
      for (let i = 0; i < 30; i++) {
        const q = service.generateQuestion('months');
        if (q.questionType === 4) {
          expect(q.question).toContain('Um welchen');
        }
      }
    });
  });
});
