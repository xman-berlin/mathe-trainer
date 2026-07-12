import { Injectable } from '@angular/core';

export interface SequenceItem {
  id: number;
  name: string;
  description: string;
}

export interface Question {
  questionType: number;
  question: string;
  options: string[];
  correctIndex: number;
}

const WEEKDAYS: SequenceItem[] = [
  { id: 1, name: 'Montag', description: 'An diesem Wochentag beginnt die Schule wieder.' },
  { id: 2, name: 'Dienstag', description: 'Das ist der zweite Tag der Woche.' },
  { id: 3, name: 'Mittwoch', description: 'Dieser Tag heißt auch "Mitten in der Woche".' },
  { id: 4, name: 'Donnerstag', description: 'Der vierte Tag der Woche.' },
  { id: 5, name: 'Freitag', description: 'Bald ist Wochenende! Das ist der fünfte Tag.' },
  { id: 6, name: 'Samstag', description: 'Keine Schule! Der sechste Tag der Woche.' },
  { id: 7, name: 'Sonntag', description: 'Der siebte und letzte Tag der Woche.' },
];

const MONTHS: SequenceItem[] = [
  { id: 1, name: 'Januar', description: 'Der erste Monat des Jahres. Es ist kalt und oft liegt Schnee.' },
  { id: 2, name: 'Februar', description: 'Der zweite Monat. Der kürzeste Monat des Jahres.' },
  { id: 3, name: 'März', description: 'Der Frühling beginnt. Das ist der dritte Monat.' },
  { id: 4, name: 'April', description: 'Der vierte Monat. "April, April!"' },
  { id: 5, name: 'Mai', description: 'Alles blüht. Der fünfte Monat des Jahres.' },
  { id: 6, name: 'Juni', description: 'Bald gibt es Sommerferien! Der sechste Monat.' },
  { id: 7, name: 'Juli', description: 'Sommerferien! Der siebte Monat des Jahres.' },
  { id: 8, name: 'August', description: 'Es ist warm. Der achte Monat des Jahres.' },
  { id: 9, name: 'September', description: 'Die Schule beginnt wieder. Der neunte Monat.' },
  { id: 10, name: 'Oktober', description: 'Die Blätter fallen. Der zehnte Monat des Jahres.' },
  { id: 11, name: 'November', description: 'Es wird kälter. Der elfte Monat des Jahres.' },
  { id: 12, name: 'Dezember', description: 'Weihnachten! Der zwölfte und letzte Monat des Jahres.' },
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(items: SequenceItem[], correct: SequenceItem, count: number): string[] {
  const others = items.filter(i => i.id !== correct.id);
  const shuffled = shuffleArray(others);
  return shuffled.slice(0, count).map(i => i.name);
}

function buildOptions(correct: SequenceItem, allItems: SequenceItem[]): { options: string[]; correctIndex: number } {
  const distractors = pickDistractors(allItems, correct, 3);
  const options = shuffleArray([correct.name, ...distractors]);
  const correctIndex = options.indexOf(correct.name);
  return { options, correctIndex };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

@Injectable({ providedIn: 'root' })
export class SequenceService {

  getWeekdays(): SequenceItem[] {
    return WEEKDAYS;
  }

  getMonths(): SequenceItem[] {
    return MONTHS;
  }

  generateQuestion(type: 'weekdays' | 'months'): Question {
    const items = type === 'weekdays' ? WEEKDAYS : MONTHS;
    const questionType = randomInt(1, 4);

    switch (questionType) {
      case 1: return this.generateBeforeAfter(items);
      case 2: return this.generatePosition(items);
      case 3: return this.generateGap(items);
      case 4: return this.generateDescription(items);
      default: return this.generatePosition(items);
    }
  }

  private generateBeforeAfter(items: SequenceItem[]): Question {
    const idx = randomInt(0, items.length - 1);
    const correct = items[idx];
    const direction: 'nach' | 'vor' = Math.random() < 0.5 ? 'nach' : 'vor';
    const label = items === WEEKDAYS ? 'Wochentag' : 'Monat';

    if (direction === 'nach') {
      if (idx === 0) {
        const next = items[1];
        return { ...buildOptions(correct, items), question: `Welcher ${label} kommt vor ${next.name}?`, questionType: 1 };
      }
      const prev = items[idx - 1];
      return { ...buildOptions(correct, items), question: `Welcher ${label} kommt nach ${prev.name}?`, questionType: 1 };
    } else {
      if (idx === items.length - 1) {
        const prev = items[idx - 1];
        return { ...buildOptions(correct, items), question: `Welcher ${label} kommt nach ${prev.name}?`, questionType: 1 };
      }
      const next = items[idx + 1];
      return { ...buildOptions(correct, items), question: `Welcher ${label} kommt vor ${next.name}?`, questionType: 1 };
    }
  }

  private generatePosition(items: SequenceItem[]): Question {
    const correct = items[randomInt(0, items.length - 1)];
    const isWeekday = items === WEEKDAYS;
    const question = isWeekday
      ? `Welcher Wochentag ist der ${correct.id}. Tag der Woche?`
      : `Welcher Monat ist der ${correct.id}. Monat des Jahres?`;

    return { ...buildOptions(correct, items), question, questionType: 2 };
  }

  private generateGap(items: SequenceItem[]): Question {
    const maxStart = items.length - 3;
    const startIdx = randomInt(0, maxStart);
    const gapPos = randomInt(0, 2);
    const chain = items.slice(startIdx, startIdx + 3);
    const correct = chain[gapPos];

    const parts = chain.map((item, idx) => {
      if (idx === gapPos) return '___';
      return item.name;
    });

    const label = items === WEEKDAYS ? 'Wochentag' : 'Monat';
    const question = `Welcher ${label} fehlt? ${parts.join(' → ')}`;

    return { ...buildOptions(correct, items), question, questionType: 3 };
  }

  private generateDescription(items: SequenceItem[]): Question {
    const correct = items[randomInt(0, items.length - 1)];
    const question = `Um welchen ${items === WEEKDAYS ? 'Wochentag' : 'Monat'} handelt es sich? ${correct.description}`;

    return { ...buildOptions(correct, items), question, questionType: 4 };
  }
}
