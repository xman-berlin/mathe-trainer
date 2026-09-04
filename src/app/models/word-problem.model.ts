export type WordProblemType =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'two-step';

export type NumberRange = 'bis20' | 'bis100';

export type TwoStepTheme = 'money-family' | 'relative-ages' | 'relative-amounts';
export type TwoStepUnit = 'euro' | 'years' | 'count';

export interface StoryTemplate {
  id: string;
  context: string;
  templates: {
    addition?: string;
    subtraction?: string;
    multiplication?: string;
    division?: string;
  };
  icon: string;
}

export interface OneStepWordProblem {
  kind: 'one-step';
  type: Exclude<WordProblemType, 'two-step'>;
  storyText: string;
  operandA: number;
  operandB: number;
  correctAnswer: number;
  templateId: string;
  numberRange: NumberRange;
}

export interface TwoStepWordProblem {
  kind: 'two-step';
  type: 'two-step';
  theme: TwoStepTheme;
  storyText: string;
  icon: string;
  templateId: string;
  givenNumbers: number[];
  intermediateValues: number[];
  expectedAddends: number[];
  correctAnswer: number;
  unit: TwoStepUnit;
  sampleRechnung: string;
  sampleAntwort: string;
  answerKeywords: string[];
  numberRange: NumberRange;
}

export type WordProblem = OneStepWordProblem | TwoStepWordProblem;

export function isTwoStepProblem(problem: WordProblem | null | undefined): problem is TwoStepWordProblem {
  return problem?.kind === 'two-step';
}
