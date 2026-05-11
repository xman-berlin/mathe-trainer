import { Injectable } from '@angular/core';
import { WordProblem, WordProblemType, NumberRange, StoryTemplate } from '../models/word-problem.model';

@Injectable({
  providedIn: 'root'
})
export class WordProblemService {
  private readonly storyTemplates: StoryTemplate[] = [
    {
      id: 'apples',
      context: 'Äpfel',
      icon: '🍎',
      templates: {
        addition: 'Lisa hat {a} Äpfel. Sie bekommt {b} Äpfel geschenkt. Wie viele hat sie jetzt?',
        subtraction: 'Tim hat {a} Äpfel. Er isst {b} Äpfel. Wie viele hat er noch?',
        multiplication: 'Es gibt {a} Körbe mit je {b} Äpfeln. Wie viele Äpfel sind das insgesamt?',
        division: '{a} Äpfel werden auf {b} Kinder verteilt. Wie viele bekommt jedes Kind?'
      }
    },
    {
      id: 'marbles',
      context: 'Murmeln',
      icon: '⚫',
      templates: {
        addition: 'Max hat {a} Murmeln. Er findet {b} Murmeln dazu. Wie viele hat er jetzt?',
        subtraction: 'Anna hat {a} Murmeln. Sie verliert {b} Murmeln. Wie viele hat sie noch?',
        multiplication: '{a} Kinder haben je {b} Murmeln. Wie viele Murmeln sind das zusammen?',
        division: '{a} Murmeln werden gleichmäßig auf {b} Freunde aufgeteilt. Wie viele bekommt jeder?'
      }
    },
    {
      id: 'books',
      context: 'Bücher',
      icon: '📚',
      templates: {
        addition: 'In einem Regal stehen {a} Bücher. Es werden {b} Bücher dazugestellt. Wie viele sind es nun?',
        subtraction: 'Die Bibliothek hat {a} Bücher. {b} Bücher werden ausgeliehen. Wie viele bleiben?',
        multiplication: 'Auf {a} Regalen liegen je {b} Bücher. Wie viele Bücher sind das?',
        division: '{a} Bücher werden auf {b} Regale verteilt. Wie viele Bücher pro Regal?'
      }
    },
    {
      id: 'stickers',
      context: 'Sticker',
      icon: '⭐',
      templates: {
        addition: 'Emma hat {a} Sticker. Sie bekommt {b} Sticker von ihrer Freundin. Wie viele hat sie nun?',
        subtraction: 'Leon hat {a} Sticker. Er verschenkt {b} Sticker. Wie viele hat er noch?',
        multiplication: '{a} Kinder haben je {b} Sticker. Wie viele Sticker haben sie zusammen?',
        division: '{a} Sticker werden fair auf {b} Kinder verteilt. Wie viele bekommt jedes Kind?'
      }
    },
    {
      id: 'cookies',
      context: 'Kekse',
      icon: '🍪',
      templates: {
        addition: 'Auf einem Teller liegen {a} Kekse. Mama legt {b} Kekse dazu. Wie viele sind es jetzt?',
        subtraction: 'Papa hat {a} Kekse gebacken. Die Kinder essen {b} Kekse. Wie viele bleiben übrig?',
        multiplication: 'Es gibt {a} Teller mit je {b} Keksen. Wie viele Kekse sind das?',
        division: '{a} Kekse werden auf {b} Teller verteilt. Wie viele Kekse pro Teller?'
      }
    },
    {
      id: 'cars',
      context: 'Spielzeugautos',
      icon: '🚗',
      templates: {
        addition: 'Paul hat {a} Spielzeugautos. Er bekommt {b} Autos zum Geburtstag. Wie viele hat er jetzt?',
        subtraction: 'Sophie hat {a} Spielzeugautos. Sie gibt {b} Autos ihrer Schwester. Wie viele hat sie noch?',
        multiplication: 'In {a} Schachteln sind je {b} Spielzeugautos. Wie viele Autos sind das insgesamt?',
        division: '{a} Spielzeugautos werden auf {b} Kisten verteilt. Wie viele Autos pro Kiste?'
      }
    },
    {
      id: 'flowers',
      context: 'Blumen',
      icon: '🌸',
      templates: {
        addition: 'In einer Vase sind {a} Blumen. Es werden {b} Blumen hinzugefügt. Wie viele sind es nun?',
        subtraction: 'Im Garten blühen {a} Blumen. {b} Blumen werden gepflückt. Wie viele bleiben?',
        multiplication: '{a} Vasen haben je {b} Blumen. Wie viele Blumen sind das zusammen?',
        division: '{a} Blumen werden gleichmäßig in {b} Vasen gestellt. Wie viele Blumen pro Vase?'
      }
    },
    {
      id: 'candies',
      context: 'Bonbons',
      icon: '🍬',
      templates: {
        addition: 'Marie hat {a} Bonbons. Sie kauft {b} Bonbons dazu. Wie viele hat sie jetzt?',
        subtraction: 'Lukas hat {a} Bonbons. Er isst {b} Bonbons. Wie viele hat er noch?',
        multiplication: '{a} Tüten enthalten je {b} Bonbons. Wie viele Bonbons sind das?',
        division: '{a} Bonbons werden fair auf {b} Kinder aufgeteilt. Wie viele bekommt jedes Kind?'
      }
    }
  ];

  private recentProblems: string[] = [];
  private readonly maxRecentProblems = 10;

  generateProblem(type: WordProblemType, range: NumberRange, maxValue?: number): WordProblem {
    // Select random template
    const availableTemplates = this.storyTemplates.filter(t => t.templates[type]);
    const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];

    let operandA: number;
    let operandB: number;
    let attempt = 0;
    const maxAttempts = 50;

    do {
      const numbers = this.generateNumbers(type, range, maxValue);
      operandA = numbers.a;
      operandB = numbers.b;
      attempt++;

      const problemKey = `${template.id}-${type}-${operandA}-${operandB}`;

      if (!this.recentProblems.includes(problemKey) || attempt >= maxAttempts) {
        this.recentProblems.push(problemKey);
        if (this.recentProblems.length > this.maxRecentProblems) {
          this.recentProblems.shift();
        }
        break;
      }
    } while (attempt < maxAttempts);

    const storyText = template.templates[type]!
      .replace('{a}', operandA.toString())
      .replace('{b}', operandB.toString());

    const correctAnswer = this.calculateAnswer(type, operandA, operandB);

    return {
      type,
      storyText,
      operandA,
      operandB,
      correctAnswer,
      templateId: template.id,
      numberRange: range
    };
  }

  private generateNumbers(type: WordProblemType, range: NumberRange, maxValue?: number): { a: number; b: number } {
    switch (type) {
      case 'addition':
        return this.generateAddition(range, maxValue);
      case 'subtraction':
        return this.generateSubtraction(range, maxValue);
      case 'multiplication':
        return this.generateMultiplication(range, maxValue);
      case 'division':
        return this.generateDivision(range, maxValue);
    }
  }

  private generateAddition(range: NumberRange, maxValue?: number): { a: number; b: number } {
    const max = maxValue ?? (range === 'bis20' ? 20 : 100);
    if (max <= 20) {
      const b = Math.floor(Math.random() * 10) + 1;
      const ones = Math.floor(Math.random() * (10 - b)) + (11 - b);
      return { a: ones, b };
    } else {
      const b = Math.floor(Math.random() * 10) + 1;
      const tens = Math.floor(Math.random() * Math.floor((max - b) / 10)) + 1;
      const ones = Math.floor(Math.random() * (10 - b)) + (11 - b);
      return { a: tens * 10 + ones, b };
    }
  }

  private generateSubtraction(range: NumberRange, maxValue?: number): { a: number; b: number } {
    const max = maxValue ?? (range === 'bis20' ? 20 : 100);
    if (max <= 20) {
      const b = Math.floor(Math.random() * 10) + 1;
      const ones = Math.floor(Math.random() * b);
      return { a: 10 + ones, b };
    } else {
      const b = Math.floor(Math.random() * 10) + 1;
      const tens = Math.floor(Math.random() * Math.floor((max - 1) / 10)) + 1;
      const ones = Math.floor(Math.random() * b);
      return { a: tens * 10 + ones, b };
    }
  }

  private generateMultiplication(range: NumberRange, maxValue?: number): { a: number; b: number } {
    const max = maxValue ?? (range === 'bis20' ? 20 : 100);
    const a = Math.floor(Math.random() * 9) + 2;
    const maxB = Math.floor(max / a);
    const b = Math.max(2, Math.floor(Math.random() * (maxB - 1)) + 2);
    return { a, b };
  }

  private generateDivision(range: NumberRange, maxValue?: number): { a: number; b: number } {
    const max = maxValue ?? (range === 'bis20' ? 20 : 100);
    const b = Math.floor(Math.random() * 9) + 2;
    const maxQuotient = Math.floor(max / b);
    const quotient = Math.max(2, Math.floor(Math.random() * (maxQuotient - 1)) + 2);
    return { a: b * quotient, b };
  }

  private calculateAnswer(type: WordProblemType, a: number, b: number): number {
    switch (type) {
      case 'addition':
        return a + b;
      case 'subtraction':
        return a - b;
      case 'multiplication':
        return a * b;
      case 'division':
        return a / b;
    }
  }

  getTemplateIcon(templateId: string): string {
    const template = this.storyTemplates.find(t => t.id === templateId);
    return template?.icon ?? '📝';
  }
}
