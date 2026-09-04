import { Injectable } from '@angular/core';

export type TimeSpanKind = 'zeitspanne' | 'verspaetung';

export interface ZeitspanneProblem {
  kind: 'zeitspanne';
  startHours: number;
  startMinutes: number;
  endHours: number;
  endMinutes: number;
  durationMinutes: number;
}

export interface VerspaetungProblem {
  kind: 'verspaetung';
  scheduledHours: number;
  scheduledMinutes: number;
  delayMinutes: number;
  destination: string;
  newHours: number;
  newMinutes: number;
}

export type TimeSpanProblem = ZeitspanneProblem | VerspaetungProblem;

export const BUS_DESTINATIONS = [
  'Heldenhausen',
  'Hintertupfingen',
  'Dosendorf',
  'Sonnenberg',
  'Fuchsingen',
  'Waldheim',
  'Mühlenbach',
  'Bergstedt',
  'Lindenau',
  'Kirchdorf',
] as const;

const FIVE_MIN_STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const DELAYS_MINUTES = [5, 10, 15, 20, 25, 30, 45, 60];

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function timeToMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): { hours: number; minutes: number } {
  const day = 24 * 60;
  const normalized = ((totalMinutes % day) + day) % day;
  return {
    hours: Math.floor(normalized / 60),
    minutes: normalized % 60,
  };
}

export function addMinutesToTime(
  hours: number,
  minutes: number,
  deltaMinutes: number
): { hours: number; minutes: number } {
  return minutesToTime(timeToMinutes(hours, minutes) + deltaMinutes);
}

/** Worksheet-style German time: "6.45 Uhr", "16 Uhr" (no leading hour zero). */
export function formatGermanTime(hours: number, minutes: number): string {
  if (minutes === 0) {
    return `${hours} Uhr`;
  }
  return `${hours}.${String(minutes).padStart(2, '0')} Uhr`;
}

/** Canonical duration: "45 min", "1 h", "1 h 30 min". */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${minutes} min`;
}

/**
 * Parse a duration answer into total minutes.
 * Accepts worksheet forms and reasonable variants: "45 min", "45min",
 * "45 Minuten", "45", "1 h 30 min", "1h30min", "1:30", "90 min".
 */
export function parseDuration(input: string): number | null {
  const raw = input
    .trim()
    .toLowerCase()
    .replace(/stunden?/g, 'h')
    .replace(/minuten/g, 'min')
    .replace(/minute/g, 'min')
    .replace(/mins\b/g, 'min')
    .replace(/,/g, '.')
    .replace(/\s+/g, ' ')
    .trim();

  if (!raw) {
    return null;
  }

  if (/^\d+$/.test(raw)) {
    return parseInt(raw, 10);
  }

  const colon = raw.match(/^(\d{1,2}):([0-5]\d)$/);
  if (colon) {
    return parseInt(colon[1], 10) * 60 + parseInt(colon[2], 10);
  }

  const hoursAndMinutes = raw.match(/^(\d+)\s*h(?:\s*(\d+)\s*(?:min)?)?$/);
  if (hoursAndMinutes) {
    const hours = parseInt(hoursAndMinutes[1], 10);
    const minutes = hoursAndMinutes[2] ? parseInt(hoursAndMinutes[2], 10) : 0;
    return hours * 60 + minutes;
  }

  const minutesOnly = raw.match(/^(\d+)\s*min$/);
  if (minutesOnly) {
    return parseInt(minutesOnly[1], 10);
  }

  return null;
}

/**
 * Parse a clock time. Accepts "14:30", "14.30", "14.30 Uhr", "1430", "16 Uhr".
 */
export function parseGermanTime(input: string): { hours: number; minutes: number } | null {
  const raw = input
    .trim()
    .toLowerCase()
    .replace(/\s*uhr\s*/g, '')
    .replace(/\s+/g, '')
    .trim();

  if (!raw) {
    return null;
  }

  const withSeparator = raw.match(/^([01]?\d|2[0-3])[:.]([0-5]\d)$/);
  if (withSeparator) {
    return {
      hours: parseInt(withSeparator[1], 10),
      minutes: parseInt(withSeparator[2], 10),
    };
  }

  if (/^([01]?\d|2[0-3])([0-5]\d)$/.test(raw) && raw.length >= 3) {
    const compact = raw.match(/^([01]?\d|2[0-3])([0-5]\d)$/);
    if (compact) {
      return {
        hours: parseInt(compact[1], 10),
        minutes: parseInt(compact[2], 10),
      };
    }
  }

  const hourOnly = raw.match(/^([01]?\d|2[0-3])$/);
  if (hourOnly) {
    return { hours: parseInt(hourOnly[1], 10), minutes: 0 };
  }

  return null;
}

export function isDurationCorrect(userAnswer: string, correctMinutes: number): boolean {
  const parsed = parseDuration(userAnswer);
  return parsed !== null && parsed === correctMinutes;
}

export function isTimeCorrect(userAnswer: string, hours: number, minutes: number): boolean {
  const parsed = parseGermanTime(userAnswer);
  return parsed !== null && parsed.hours === hours && parsed.minutes === minutes;
}

@Injectable({
  providedIn: 'root',
})
export class DurationService {
  generateProblem(kind: TimeSpanKind): TimeSpanProblem {
    return kind === 'zeitspanne' ? this.generateZeitspanne() : this.generateVerspaetung();
  }

  generateZeitspanne(): ZeitspanneProblem {
    const roll = Math.random();
    if (roll < 0.3) {
      return this.generateSameHourSpan();
    }
    if (roll < 0.55) {
      return this.generateCrossHourSpan();
    }
    if (roll < 0.7) {
      return this.generateHoursOnlySpan();
    }
    return this.generateHoursAndMinutesSpan();
  }

  generateVerspaetung(): VerspaetungProblem {
    const destination = pick(BUS_DESTINATIONS);
    const roll = Math.random();

    let scheduledHours: number;
    let scheduledMinutes: number;
    let delayMinutes: number;

    if (roll < 0.15) {
      delayMinutes = 60;
      scheduledHours = randomInt(6, 18);
      scheduledMinutes = Math.random() < 0.5 ? pick(FIVE_MIN_STEPS) : randomInt(0, 59);
    } else if (roll < 0.5) {
      delayMinutes = pick(DELAYS_MINUTES.filter((d) => d < 60));
      scheduledHours = randomInt(6, 18);
      const maxStartMinute = 59 - delayMinutes;
      scheduledMinutes =
        maxStartMinute >= 0
          ? randomInt(0, maxStartMinute)
          : randomInt(0, 59);
    } else {
      delayMinutes = pick([10, 15, 20, 25, 30, 45, 60]);
      scheduledHours = randomInt(6, 18);
      const minStart = Math.max(0, 60 - delayMinutes);
      scheduledMinutes = randomInt(minStart, 59);
    }

    const arrival = addMinutesToTime(scheduledHours, scheduledMinutes, delayMinutes);

    return {
      kind: 'verspaetung',
      scheduledHours,
      scheduledMinutes,
      delayMinutes,
      destination,
      newHours: arrival.hours,
      newMinutes: arrival.minutes,
    };
  }

  formatGermanTime(hours: number, minutes: number): string {
    return formatGermanTime(hours, minutes);
  }

  formatDuration(totalMinutes: number): string {
    return formatDuration(totalMinutes);
  }

  parseDuration(input: string): number | null {
    return parseDuration(input);
  }

  parseGermanTime(input: string): { hours: number; minutes: number } | null {
    return parseGermanTime(input);
  }

  isDurationCorrect(userAnswer: string, correctMinutes: number): boolean {
    return isDurationCorrect(userAnswer, correctMinutes);
  }

  isTimeCorrect(userAnswer: string, hours: number, minutes: number): boolean {
    return isTimeCorrect(userAnswer, hours, minutes);
  }

  getTypeLabel(kind: TimeSpanKind): string {
    return kind === 'zeitspanne' ? 'Zeitspannen' : 'Verspätung';
  }

  getTypeIcon(kind: TimeSpanKind): string {
    return kind === 'zeitspanne' ? '⏳' : '🚌';
  }

  private generateSameHourSpan(): ZeitspanneProblem {
    const startHours = randomInt(6, 18);
    const startMinutes = pick(FIVE_MIN_STEPS.filter((m) => m <= 45));
    const durationMinutes = pick(
      FIVE_MIN_STEPS.filter((d) => d >= 10 && startMinutes + d < 60)
    );
    return this.buildSpan(startHours, startMinutes, durationMinutes);
  }

  private generateCrossHourSpan(): ZeitspanneProblem {
    const startHours = randomInt(6, 17);
    const startMinutes = pick(FIVE_MIN_STEPS.filter((m) => m >= 20));
    const durationMinutes = pick(
      FIVE_MIN_STEPS.filter((d) => d >= 15 && d <= 55 && startMinutes + d >= 60 && startMinutes + d < 120)
    );
    return this.buildSpan(startHours, startMinutes, durationMinutes);
  }

  private generateHoursOnlySpan(): ZeitspanneProblem {
    const durationHours = randomInt(1, 5);
    const startHours = randomInt(6, 20 - durationHours);
    return this.buildSpan(startHours, 0, durationHours * 60);
  }

  private generateHoursAndMinutesSpan(): ZeitspanneProblem {
    const durationHours = randomInt(1, 4);
    const durationMinutes = pick([15, 30, 45]);
    const startMinutes = pick([0, 15, 30, 45]);
    const total = durationHours * 60 + durationMinutes;
    const maxStartHours = Math.floor((20 * 60 - total - startMinutes) / 60);
    if (maxStartHours < 6) {
      return this.generateHoursOnlySpan();
    }
    const startHours = randomInt(6, maxStartHours);
    return this.buildSpan(startHours, startMinutes, total);
  }

  private buildSpan(startHours: number, startMinutes: number, durationMinutes: number): ZeitspanneProblem {
    const end = addMinutesToTime(startHours, startMinutes, durationMinutes);
    return {
      kind: 'zeitspanne',
      startHours,
      startMinutes,
      endHours: end.hours,
      endMinutes: end.minutes,
      durationMinutes,
    };
  }
}
