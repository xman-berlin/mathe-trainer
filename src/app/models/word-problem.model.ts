export type WordProblemType = 'addition' | 'subtraction' | 'multiplication' | 'division';
export type NumberRange = 'bis20' | 'bis100';

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

export interface WordProblem {
  type: WordProblemType;
  storyText: string;
  operandA: number;
  operandB: number;
  correctAnswer: number;
  templateId: string;
  numberRange: NumberRange;
}
