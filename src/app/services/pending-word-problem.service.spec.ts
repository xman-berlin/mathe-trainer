import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { PendingWordProblemService } from './pending-word-problem.service';
import type { OneStepWordProblem, TwoStepWordProblem } from '../models/word-problem.model';

describe('PendingWordProblemService', () => {
  let service: PendingWordProblemService;
  let store: Record<string, string>;

  const oneStep: OneStepWordProblem = {
    kind: 'one-step',
    type: 'subtraction',
    storyText:
      'Toni hat 48 Seiten im Buch gelesen, Sabina schon 56. Um wie viele Seiten hat Sabina mehr gelesen?',
    operandA: 56,
    operandB: 48,
    correctAnswer: 8,
    templateId: 'cmp-pages',
    numberRange: 'bis100',
  };

  const twoStep: TwoStepWordProblem = {
    kind: 'two-step',
    type: 'two-step',
    theme: 'money-family',
    storyText: 'Bobbi fährt mit dem Bus.',
    icon: '🚌',
    templateId: 'bus-ticket',
    givenNumbers: [17, 6],
    intermediateValues: [11],
    expectedAddends: [17, 17, 11],
    correctAnswer: 45,
    unit: 'euro',
    sampleRechnung: '17 + 17 + 11 = 45',
    sampleAntwort: 'Die Familie bezahlt 45€.',
    answerKeywords: ['familie', 'bezahlt'],
    numberRange: 'bis100',
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
      providers: [provideZonelessChangeDetection(), PendingWordProblemService],
    });
    service = TestBed.inject(PendingWordProblemService);
  });

  it('should save and load a one-step problem', () => {
    service.save(oneStep);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'schlaufuchs-pending-word-problem',
      JSON.stringify(oneStep)
    );
    expect(service.load()).toEqual(oneStep);
  });

  it('should save and load a two-step problem', () => {
    service.save(twoStep);
    expect(service.load()?.kind).toBe('two-step');
    expect(service.load()?.correctAnswer).toBe(45);
  });

  it('should clear storage', () => {
    service.save(oneStep);
    service.clear();
    expect(localStorage.removeItem).toHaveBeenCalledWith('schlaufuchs-pending-word-problem');
    expect(service.load()).toBeNull();
  });

  it('should reject invalid payload', () => {
    store['schlaufuchs-pending-word-problem'] = JSON.stringify({ type: 'addition' });
    expect(service.load()).toBeNull();
    expect(localStorage.removeItem).toHaveBeenCalledWith('schlaufuchs-pending-word-problem');
  });
});
