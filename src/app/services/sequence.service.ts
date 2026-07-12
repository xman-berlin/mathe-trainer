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

const ALPHABET: SequenceItem[] = [
  { id: 1, name: 'A', description: 'Der erste Buchstabe im Alphabet und ein Vokal.' },
  { id: 2, name: 'B', description: 'Der zweite Buchstabe im Alphabet und ein Konsonant.' },
  { id: 3, name: 'C', description: 'Der dritte Buchstabe im Alphabet und ein Konsonant.' },
  { id: 4, name: 'D', description: 'Der vierte Buchstabe im Alphabet und ein Konsonant.' },
  { id: 5, name: 'E', description: 'Der fünfte Buchstabe im Alphabet und ein Vokal.' },
  { id: 6, name: 'F', description: 'Der sechste Buchstabe im Alphabet und ein Konsonant.' },
  { id: 7, name: 'G', description: 'Der siebte Buchstabe im Alphabet und ein Konsonant.' },
  { id: 8, name: 'H', description: 'Der achte Buchstabe im Alphabet und ein Konsonant.' },
  { id: 9, name: 'I', description: 'Der neunte Buchstabe im Alphabet und ein Vokal.' },
  { id: 10, name: 'J', description: 'Der zehnte Buchstabe im Alphabet und ein Konsonant.' },
  { id: 11, name: 'K', description: 'Der elfte Buchstabe im Alphabet und ein Konsonant.' },
  { id: 12, name: 'L', description: 'Der zwölfte Buchstabe im Alphabet und ein Konsonant.' },
  { id: 13, name: 'M', description: 'Der dreizehnte Buchstabe im Alphabet und ein Konsonant.' },
  { id: 14, name: 'N', description: 'Der vierzehnte Buchstabe im Alphabet und ein Konsonant.' },
  { id: 15, name: 'O', description: 'Der fünfzehnte Buchstabe im Alphabet und ein Vokal.' },
  { id: 16, name: 'P', description: 'Der sechzehnte Buchstabe im Alphabet und ein Konsonant.' },
  { id: 17, name: 'Q', description: 'Der siebzehnte Buchstabe im Alphabet und ein Konsonant.' },
  { id: 18, name: 'R', description: 'Der achtzehnte Buchstabe im Alphabet und ein Konsonant.' },
  { id: 19, name: 'S', description: 'Der neunzehnte Buchstabe im Alphabet und ein Konsonant.' },
  { id: 20, name: 'T', description: 'Der zwanzigste Buchstabe im Alphabet und ein Konsonant.' },
  { id: 21, name: 'U', description: 'Der einundzwanzigste Buchstabe im Alphabet und ein Vokal.' },
  { id: 22, name: 'V', description: 'Der zweiundzwanzigste Buchstabe im Alphabet und ein Konsonant.' },
  { id: 23, name: 'W', description: 'Der dreiundzwanzigste Buchstabe im Alphabet und ein Konsonant.' },
  { id: 24, name: 'X', description: 'Der vierundzwanzigste Buchstabe im Alphabet und ein Konsonant.' },
  { id: 25, name: 'Y', description: 'Der fünfundzwanzigste Buchstabe im Alphabet. Mal Vokal, mal Konsonant.' },
  { id: 26, name: 'Z', description: 'Der sechsundzwanzigste und letzte Buchstabe im Alphabet. Ein Konsonant.' },
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

function itemsFor(type: 'weekdays' | 'months' | 'alphabet'): SequenceItem[] {
  switch (type) {
    case 'weekdays': return WEEKDAYS;
    case 'months': return MONTHS;
    case 'alphabet': return ALPHABET;
  }
}

function itemLabel(items: SequenceItem[], lower = false): string {
  const label = items === WEEKDAYS ? 'Wochentag' : items === MONTHS ? 'Monat' : 'Buchstabe';
  return lower ? label.toLowerCase() : label;
}

@Injectable({ providedIn: 'root' })
export class SequenceService {

  getWeekdays(): SequenceItem[] {
    return WEEKDAYS;
  }

  getMonths(): SequenceItem[] {
    return MONTHS;
  }

  getAlphabet(): SequenceItem[] {
    return ALPHABET;
  }

  generateQuestion(type: 'weekdays' | 'months' | 'alphabet'): Question {
    const items = itemsFor(type);
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
    const label = itemLabel(items);

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
    const label = itemLabel(items);
    const ofPhrase = items === ALPHABET ? 'im Alphabet' : items === MONTHS ? 'des Jahres' : 'der Woche';
    const question = `Welcher ${label} ist der ${correct.id}. ${ofPhrase}?`;

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

    const label = itemLabel(items);
    const question = `Welcher ${label} fehlt? ${parts.join(' → ')}`;

    return { ...buildOptions(correct, items), question, questionType: 3 };
  }

  private generateDescription(items: SequenceItem[]): Question {
    const correct = items[randomInt(0, items.length - 1)];
    const label = itemLabel(items);
    const question = `Um welchen ${label} handelt es sich? ${correct.description}`;

    return { ...buildOptions(correct, items), question, questionType: 4 };
  }
}
