import {
  buildAllowedNumbers,
  evaluateAddSub,
  generateTwoStepProblem,
  getWorksheetExamples,
  gradeAntwort,
  gradeRechnung,
  gradeTwoStep,
  resetTwoStepRotation,
} from './two-step-word-problem';

describe('two-step word problems', () => {
  const [busTickets, relativeAges] = getWorksheetExamples();

  describe('worksheet examples', () => {
    it('should expose the bus-ticket worksheet problem', () => {
      expect(busTickets.storyText).toBe(
        'Bobbi fährt mit seinen Eltern mit dem Bus. Eine Erwachsenenkarte kostet 17€. Kinder bezahlen 6€ weniger. Wie viel muss die Familie bezahlen?'
      );
      expect(busTickets.correctAnswer).toBe(45);
      expect(busTickets.intermediateValues).toContain(11);
      expect(busTickets.expectedAddends).toEqual([17, 17, 11]);
    });

    it('should expose the relative-ages worksheet problem', () => {
      expect(relativeAges.storyText).toBe(
        'Lilo ist 12 Jahre alt. Ihr Bruder Carlo ist 9 Jahre älter. Ihre Schwester Mimi ist 7 Jahre jünger. Wie alt sind die 3 Kinder zusammen?'
      );
      expect(relativeAges.correctAnswer).toBe(38);
      expect(relativeAges.intermediateValues).toContain(21);
      expect(relativeAges.intermediateValues).toContain(5);
      expect(relativeAges.expectedAddends).toEqual([12, 21, 5]);
    });
  });

  describe('gradeRechnung — bus tickets', () => {
    it('should accept the worksheet calculation with euro signs', () => {
      expect(gradeRechnung('17 € + 17 € + 11 € = 45 €', busTickets)).toBeTrue();
    });

    it('should accept compact euro signs and addend order changes', () => {
      expect(gradeRechnung('17€ + 17€ + 11€ = 45€', busTickets)).toBeTrue();
      expect(gradeRechnung('11 + 17 + 17 = 45', busTickets)).toBeTrue();
      expect(gradeRechnung('17+17+11=45', busTickets)).toBeTrue();
    });

    it('should accept intermediate steps then the final sum', () => {
      expect(gradeRechnung('17-6=11, 17+17+11=45', busTickets)).toBeTrue();
      expect(gradeRechnung('17 - 6 = 11; 17 + 17 + 11 = 45', busTickets)).toBeTrue();
    });

    it('should accept grouped addends such as 34 + 11', () => {
      expect(gradeRechnung('34 + 11 = 45', busTickets)).toBeTrue();
    });

    it('should accept an expression without equals if it evaluates to 45', () => {
      expect(gradeRechnung('17+17+11', busTickets)).toBeTrue();
    });

    it('should reject a wrong numeric result', () => {
      expect(gradeRechnung('17 + 17 + 11 = 40', busTickets)).toBeFalse();
      expect(gradeRechnung('17 + 17 = 34', busTickets)).toBeFalse();
    });

    it('should reject numbers that are not part of the problem', () => {
      expect(gradeRechnung('10 + 35 = 45', busTickets)).toBeFalse();
      expect(gradeRechnung('1 + 2 = 45', busTickets)).toBeFalse();
    });

    it('should reject only the final number without a calculation', () => {
      expect(gradeRechnung('45', busTickets)).toBeFalse();
      expect(gradeRechnung('= 45', busTickets)).toBeFalse();
    });
  });

  describe('gradeRechnung — relative ages', () => {
    it('should accept the worksheet calculation', () => {
      expect(gradeRechnung('12 + 21 + 5 = 38', relativeAges)).toBeTrue();
    });

    it('should accept addend order changes and intermediate steps', () => {
      expect(gradeRechnung('21 + 5 + 12 = 38', relativeAges)).toBeTrue();
      expect(gradeRechnung('12+9=21, 12-7=5, 12+21+5=38', relativeAges)).toBeTrue();
    });

    it('should reject a wrong total', () => {
      expect(gradeRechnung('12 + 21 + 5 = 37', relativeAges)).toBeFalse();
    });
  });

  describe('gradeAntwort', () => {
    it('should accept a correct German family-payment sentence', () => {
      expect(gradeAntwort('Die Familie bezahlt 45€.', busTickets)).toBeTrue();
      expect(gradeAntwort('Die Familie muss 45 Euro bezahlen.', busTickets)).toBeTrue();
      expect(gradeAntwort('Zusammen kostet es 45€.', busTickets)).toBeTrue();
    });

    it('should be lenient with spelling if the number and meaning are present', () => {
      expect(gradeAntwort('Die Eltern bezalen 45€.', busTickets)).toBeTrue();
      expect(gradeAntwort('Ale zusammen sind 38 Jähre.', relativeAges)).toBeTrue();
    });

    it('should reject the worksheet student answer with the wrong amount 40€', () => {
      expect(gradeAntwort('Die ELtern bezalen 40€.', busTickets)).toBeFalse();
    });

    it('should reject a number without German meaning', () => {
      expect(gradeAntwort('45', busTickets)).toBeFalse();
      expect(gradeAntwort('38', relativeAges)).toBeFalse();
    });

    it('should reject a sentence without the correct number', () => {
      expect(gradeAntwort('Die Familie bezahlt viel.', busTickets)).toBeFalse();
    });
  });

  describe('gradeTwoStep', () => {
    it('should require both Rechnung and Antwort to be correct', () => {
      const both = gradeTwoStep(
        '17 + 17 + 11 = 45',
        'Die Familie bezahlt 45€.',
        busTickets
      );
      expect(both.isCorrect).toBeTrue();
      expect(both.rechnungCorrect).toBeTrue();
      expect(both.antwortCorrect).toBeTrue();

      const badAnswer = gradeTwoStep(
        '17 + 17 + 11 = 45',
        'Die ELtern bezalen 40€.',
        busTickets
      );
      expect(badAnswer.isCorrect).toBeFalse();
      expect(badAnswer.rechnungCorrect).toBeTrue();
      expect(badAnswer.antwortCorrect).toBeFalse();
    });
  });

  describe('generateTwoStepProblem', () => {
    beforeEach(() => {
      resetTwoStepRotation();
    });

    it('should start with the worksheet templates', () => {
      const first = generateTwoStepProblem(100);
      const second = generateTwoStepProblem(100);
      expect(first.storyText).toContain('Bobbi fährt mit seinen Eltern mit dem Bus');
      expect(first.correctAnswer).toBe(45);
      expect(second.storyText).toContain('Lilo ist 12 Jahre alt');
      expect(second.correctAnswer).toBe(38);
    });

    it('should generate valid two-step problems in a Grundschule range', () => {
      for (let i = 0; i < 30; i++) {
        const problem = generateTwoStepProblem(100);
        expect(problem.kind).toBe('two-step');
        expect(problem.type).toBe('two-step');
        expect(problem.storyText).toBeTruthy();
        expect(problem.storyText).not.toContain('{');
        expect(problem.correctAnswer).toBeGreaterThan(0);
        expect(problem.correctAnswer).toBeLessThanOrEqual(100);
        expect(problem.expectedAddends.reduce((sum, n) => sum + n, 0)).toBe(problem.correctAnswer);
        expect(problem.sampleRechnung).toContain(String(problem.correctAnswer));
        expect(problem.sampleAntwort).toContain(String(problem.correctAnswer));
        expect(problem.answerKeywords.length).toBeGreaterThan(0);
      }
    });

    it('should produce every two-step template family', () => {
      const templateIds = new Set<string>();
      const themes = new Set<string>();
      for (let i = 0; i < 14; i++) {
        const problem = generateTwoStepProblem(100);
        templateIds.add(problem.templateId.replace(/-Sticker|-Murmel|-Apfel|-Keks/, ''));
        themes.add(problem.theme);
      }
      expect(themes.has('money-family')).toBeTrue();
      expect(themes.has('relative-ages')).toBeTrue();
      expect(themes.has('relative-amounts')).toBeTrue();
      expect(templateIds.has('money-family-tickets')).toBeTrue();
      expect(templateIds.has('relative-ages')).toBeTrue();
      expect(templateIds.has('relative-amounts')).toBeTrue();
      expect(templateIds.has('pocket-money')).toBeTrue();
      expect(templateIds.has('shopping-pair')).toBeTrue();
    });

    it('should keep totals within maxValue when possible', () => {
      for (let i = 0; i < 20; i++) {
        const problem = generateTwoStepProblem(80);
        expect(problem.correctAnswer).toBeLessThanOrEqual(80);
      }
    });
  });

  describe('helpers', () => {
    it('should evaluate plus and minus expressions', () => {
      expect(evaluateAddSub('17+17+11')).toBe(45);
      expect(evaluateAddSub('17 - 6')).toBe(11);
      expect(evaluateAddSub('12 + 21 + 5')).toBe(38);
    });

    it('should include derived subset sums in allowed numbers', () => {
      const allowed = buildAllowedNumbers(busTickets);
      expect(allowed.has(17)).toBeTrue();
      expect(allowed.has(11)).toBeTrue();
      expect(allowed.has(34)).toBeTrue();
    });
  });
});
