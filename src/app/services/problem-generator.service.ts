import { Injectable } from '@angular/core';

export type OperationType = 'addition' | 'subtraction' | 'multiplication' | 'division';

export interface Problem {
  operandA: number;
  operandB: number;
  answer: number;
  operation: OperationType;
  symbol: string;
  text: string;
}

/**
 * Service for generating math problems
 * Used by ExerciseComponent and BalloonPopComponent
 */
@Injectable({
  providedIn: 'root',
})
export class ProblemGeneratorService {
  /**
   * Generate a random integer between min and max (inclusive)
   */
  randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate an addition problem with 10s crossing
   * (a % 10) + b > 10, forces carrying
   */
  generateAddition(): Problem {
    const b = this.randomInt(1, 10);
    const minOnes = 11 - b;
    const maxOnes = 9;
    const ones = this.randomInt(minOnes, maxOnes);
    const maxTens = Math.floor((100 - b) / 10);
    const tens = this.randomInt(0, maxTens);
    const a = tens * 10 + ones;

    return {
      operandA: a,
      operandB: b,
      answer: a + b,
      operation: 'addition',
      symbol: '+',
      text: `${a} + ${b} = ?`,
    };
  }

  /**
   * Generate a subtraction problem with 10s crossing
   * (a % 10) < b, forces borrowing
   */
  generateSubtraction(): Problem {
    const b = this.randomInt(1, 10);
    const ones = this.randomInt(0, b - 1);
    const minTens = 1;
    const maxTens = 10;
    const tens = this.randomInt(minTens, maxTens);
    const a = tens * 10 + ones;

    return {
      operandA: a,
      operandB: b,
      answer: a - b,
      operation: 'subtraction',
      symbol: '−',
      text: `${a} − ${b} = ?`,
    };
  }

  /**
   * Generate a multiplication problem (1-10 x 1-10)
   */
  generateMultiplication(allowedNumbers?: Set<number>): Problem {
    let a: number;
    let b: number;

    if (allowedNumbers && allowedNumbers.size > 0) {
      const numbers = Array.from(allowedNumbers);
      a = this.randomInt(1, 10);
      b = numbers[Math.floor(Math.random() * numbers.length)];
    } else {
      a = this.randomInt(1, 10);
      b = this.randomInt(1, 10);
    }

    return {
      operandA: a,
      operandB: b,
      answer: a * b,
      operation: 'multiplication',
      symbol: '×',
      text: `${a} × ${b} = ?`,
    };
  }

  /**
   * Generate a division problem (result is whole number 1-10)
   */
  generateDivision(allowedNumbers?: Set<number>): Problem {
    let b: number;

    if (allowedNumbers && allowedNumbers.size > 0) {
      const numbers = Array.from(allowedNumbers);
      b = numbers[Math.floor(Math.random() * numbers.length)];
    } else {
      b = this.randomInt(1, 10);
    }

    const quotient = this.randomInt(1, 10);
    const a = b * quotient;

    return {
      operandA: a,
      operandB: b,
      answer: quotient,
      operation: 'division',
      symbol: '÷',
      text: `${a} ÷ ${b} = ?`,
    };
  }

  /**
   * Generate a random problem of specified types
   */
  generateProblem(
    types: OperationType[],
    allowedNumbers?: Set<number>
  ): Problem {
    const type = types[Math.floor(Math.random() * types.length)];

    switch (type) {
      case 'addition':
        return this.generateAddition();
      case 'subtraction':
        return this.generateSubtraction();
      case 'multiplication':
        return this.generateMultiplication(allowedNumbers);
      case 'division':
        return this.generateDivision(allowedNumbers);
    }
  }
}
