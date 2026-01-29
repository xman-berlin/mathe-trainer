import { Injectable } from '@angular/core';

export type ClockExerciseType = 'full' | 'half' | 'quarter';
export type TimeOfDay = 'morning' | 'afternoon';

export interface ClockProblem {
  hours: number;      // 0-11 (for analog display)
  minutes: number;    // 0, 15, 30, 45
  timeOfDay: TimeOfDay;
  correctAnswer: string; // HH:MM in 24h format
}

@Injectable({
  providedIn: 'root'
})
export class ClockService {

  /**
   * Generates a random clock problem based on exercise type
   */
  generateProblem(type: ClockExerciseType): ClockProblem {
    let hours: number;
    let minutes: number;
    const timeOfDay: TimeOfDay = Math.random() < 0.5 ? 'morning' : 'afternoon';

    switch (type) {
      case 'full':
        // Full hours: minutes = 0, hours = 1-12
        hours = Math.floor(Math.random() * 12); // 0-11
        minutes = 0;
        break;

      case 'half':
        // Half hours: minutes = 30, hours = 1-12
        hours = Math.floor(Math.random() * 12);
        minutes = 30;
        break;

      case 'quarter':
        // Quarter hours: minutes = 15 or 45, hours = 1-12
        hours = Math.floor(Math.random() * 12);
        minutes = Math.random() < 0.5 ? 15 : 45;
        break;
    }

    const correctAnswer = this.formatTime24h(hours, minutes, timeOfDay);

    return {
      hours,
      minutes,
      timeOfDay,
      correctAnswer
    };
  }

  /**
   * Formats time to 24h format (HH:MM)
   */
  private formatTime24h(hours: number, minutes: number, timeOfDay: TimeOfDay): string {
    let hours24 = hours;
    if (hours === 0) hours24 = 12; // 0 on analog clock = 12

    if (timeOfDay === 'afternoon' && hours24 !== 12) {
      hours24 += 12;
    } else if (timeOfDay === 'morning' && hours24 === 12) {
      hours24 = 0; // 12 AM = 00:xx
    }

    return `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  /**
   * Validates if the answer is in correct HH:MM format
   */
  isValidFormat(answer: string): boolean {
    const regex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    return regex.test(answer);
  }

  /**
   * Checks if the user's answer is correct
   */
  isCorrect(userAnswer: string, correctAnswer: string): boolean {
    return userAnswer === correctAnswer;
  }

  /**
   * Gets the label for exercise type
   */
  getTypeLabel(type: ClockExerciseType): string {
    const labels: Record<ClockExerciseType, string> = {
      'full': 'Volle Stunden',
      'half': 'Halbe Stunden',
      'quarter': 'Viertelstunden'
    };
    return labels[type];
  }

  /**
   * Gets the time of day label with emoji
   */
  getTimeOfDayLabel(timeOfDay: TimeOfDay): string {
    return timeOfDay === 'morning' ? '☀️ Vormittag' : '🌙 Nachmittag';
  }
}
