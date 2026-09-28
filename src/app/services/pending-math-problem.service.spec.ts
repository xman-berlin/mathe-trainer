import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { PendingMathProblemService } from './pending-math-problem.service';

describe('PendingMathProblemService', () => {
  let service: PendingMathProblemService;

  beforeEach(() => {
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');
    spyOn(localStorage, 'removeItem');

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(PendingMathProblemService);
  });

  it('save writes JSON to localStorage', () => {
    service.save({ operation: 'addition', operandA: 12, operandB: 7 });
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'schlaufuchs-pending-math-problem',
      JSON.stringify({ operation: 'addition', operandA: 12, operandB: 7 })
    );
  });

  it('load returns stored problem', () => {
    (localStorage.getItem as jasmine.Spy).and.returnValue(
      JSON.stringify({ operation: 'subtraction', operandA: 50, operandB: 8 })
    );
    expect(service.load()).toEqual({
      operation: 'subtraction',
      operandA: 50,
      operandB: 8,
    });
  });

  it('load returns null and clears invalid data', () => {
    (localStorage.getItem as jasmine.Spy).and.returnValue(JSON.stringify({ operation: 'nope' }));
    expect(service.load()).toBeNull();
    expect(localStorage.removeItem).toHaveBeenCalledWith('schlaufuchs-pending-math-problem');
  });

  it('clear removes storage key', () => {
    service.clear();
    expect(localStorage.removeItem).toHaveBeenCalledWith('schlaufuchs-pending-math-problem');
  });
});
