import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { PendingNumberSequenceService } from './pending-number-sequence.service';
import type { NumberSequenceProblem } from './number-sequence-generator.service';

describe('PendingNumberSequenceService', () => {
  let service: PendingNumberSequenceService;
  let store: Record<string, string>;

  const problem: NumberSequenceProblem = {
    terms: [2, 4, 6, 8, 10],
    gapIndices: [2, 4],
    step: 2,
    kind: 'arithmetic',
    level: 2,
  };

  beforeEach(() => {
    store = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => store[key] ?? null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      store[key] = value;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete store[key];
    });

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), PendingNumberSequenceService],
    });
    service = TestBed.inject(PendingNumberSequenceService);
  });

  it('should save and load a pending sequence', () => {
    const pending = {
      problem,
      gapAnswers: ['6', ''],
      activeGapIndex: 1,
    };
    service.save(pending);
    expect(service.load()).toEqual(pending);
  });

  it('should clear storage', () => {
    service.save({ problem, gapAnswers: ['', ''], activeGapIndex: 0 });
    service.clear();
    expect(localStorage.removeItem).toHaveBeenCalledWith('schlaufuchs-pending-number-sequence');
    expect(service.load()).toBeNull();
  });

  it('should reject invalid payload', () => {
    store['schlaufuchs-pending-number-sequence'] = JSON.stringify({
      problem: { terms: [1, 2], gapIndices: [1], step: 1, level: 1 },
      gapAnswers: [''],
      activeGapIndex: 0,
    });
    expect(service.load()).toBeNull();
  });

  it('should reject mismatched gapAnswers length', () => {
    store['schlaufuchs-pending-number-sequence'] = JSON.stringify({
      problem,
      gapAnswers: [''],
      activeGapIndex: 0,
    });
    expect(service.load()).toBeNull();
  });
});
