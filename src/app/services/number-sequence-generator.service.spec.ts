import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  NumberSequenceGeneratorService,
  NumberSequenceProblem,
} from './number-sequence-generator.service';

function assertPattern(p: NumberSequenceProblem): void {
  const { terms, kind, step, stepB } = p;
  for (let t = 1; t < terms.length; t++) {
    const prev = terms[t - 1];
    const cur = terms[t];
    if (kind === 'arithmetic') {
      expect(cur - prev).toBe(step);
    } else if (kind === 'alternating-add') {
      if (t % 2 === 1) expect(cur - prev).toBe(step);
      else expect(prev - cur).toBe(stepB!);
    } else if (kind === 'geometric') {
      expect(cur === prev * step || prev === cur * step).toBeTrue();
    } else {
      if (t % 2 === 1) expect(cur).toBe(prev * step);
      else expect(prev).toBe(cur * stepB!);
    }
  }
}

describe('NumberSequenceGeneratorService', () => {
  let service: NumberSequenceGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), NumberSequenceGeneratorService],
    });
    service = TestBed.inject(NumberSequenceGeneratorService);
  });

  it('should generate valid sequences for levels 1–5', () => {
    for (let level = 1; level <= 5; level++) {
      for (let i = 0; i < 40; i++) {
        const p = service.generate(level);
        expect(p.terms.length).toBeGreaterThanOrEqual(5);
        expect(p.gapIndices.length).toBeGreaterThanOrEqual(1);
        expect(p.gapIndices.length).toBeLessThanOrEqual(3);
        expect(p.gapIndices.length).toBeLessThanOrEqual(p.terms.length - 2);
        expect(p.kind).toBeTruthy();
        assertPattern(p);
        for (const term of p.terms) {
          expect(term).toBeGreaterThanOrEqual(1);
          expect(term).toBeLessThanOrEqual(999);
        }
        const unique = new Set(p.gapIndices);
        expect(unique.size).toBe(p.gapIndices.length);
      }
    }
  });

  it('should only use arithmetic on levels 1–3', () => {
    for (let level = 1; level <= 3; level++) {
      for (let i = 0; i < 30; i++) {
        expect(service.generate(level).kind).toBe('arithmetic');
      }
    }
  });

  it('should allow alternating +/− from level 4, but not ×/÷ yet', () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 60; i++) {
      kinds.add(service.generate(4).kind);
    }
    expect(kinds.has('arithmetic')).toBeTrue();
    expect(kinds.has('alternating-add')).toBeTrue();
    expect(kinds.has('geometric')).toBeFalse();
    expect(kinds.has('alternating-mul')).toBeFalse();
  });

  it('should include ×/÷ patterns at level 5', () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 80; i++) {
      kinds.add(service.generate(5).kind);
    }
    expect(kinds.has('arithmetic')).toBeTrue();
    expect(kinds.has('alternating-add')).toBeTrue();
    expect(kinds.has('geometric') || kinds.has('alternating-mul')).toBeTrue();
  });

  it('should clamp invalid levels', () => {
    const low = service.generate(0);
    const high = service.generate(99);
    expect(low.terms.length).toBeGreaterThanOrEqual(3);
    expect(high.terms.length).toBeGreaterThanOrEqual(3);
  });
});
