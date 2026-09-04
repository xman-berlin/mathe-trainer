import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  DurationService,
  addMinutesToTime,
  formatDuration,
  formatGermanTime,
  isDurationCorrect,
  isTimeCorrect,
  parseDuration,
  parseGermanTime,
  timeToMinutes,
} from './duration.service';

describe('Duration helpers', () => {
  describe('formatGermanTime', () => {
    it('formats minutes with a dot and Uhr', () => {
      expect(formatGermanTime(6, 45)).toBe('6.45 Uhr');
      expect(formatGermanTime(14, 20)).toBe('14.20 Uhr');
      expect(formatGermanTime(14, 50)).toBe('14.50 Uhr');
    });

    it('omits minutes on the hour', () => {
      expect(formatGermanTime(16, 0)).toBe('16 Uhr');
      expect(formatGermanTime(18, 0)).toBe('18 Uhr');
    });

    it('does not pad the hour', () => {
      expect(formatGermanTime(9, 5)).toBe('9.05 Uhr');
    });
  });

  describe('formatDuration', () => {
    it('formats minutes only', () => {
      expect(formatDuration(45)).toBe('45 min');
      expect(formatDuration(20)).toBe('20 min');
    });

    it('formats whole hours', () => {
      expect(formatDuration(60)).toBe('1 h');
      expect(formatDuration(120)).toBe('2 h');
    });

    it('formats hours and minutes like the worksheet', () => {
      expect(formatDuration(90)).toBe('1 h 30 min');
      expect(formatDuration(270)).toBe('4 h 30 min');
    });
  });

  describe('parseDuration', () => {
    it('accepts worksheet-style answers', () => {
      expect(parseDuration('45 min')).toBe(45);
      expect(parseDuration('20 min')).toBe(20);
      expect(parseDuration('1 h 30 min')).toBe(90);
      expect(parseDuration('4 h 30 min')).toBe(270);
    });

    it('accepts compact and German-word variants', () => {
      expect(parseDuration('45min')).toBe(45);
      expect(parseDuration('45 Minuten')).toBe(45);
      expect(parseDuration('45')).toBe(45);
      expect(parseDuration('1h 30min')).toBe(90);
      expect(parseDuration('1h30min')).toBe(90);
      expect(parseDuration('1 h 30')).toBe(90);
      expect(parseDuration('1:30')).toBe(90);
      expect(parseDuration('90 min')).toBe(90);
      expect(parseDuration('90')).toBe(90);
      expect(parseDuration('1 h')).toBe(60);
      expect(parseDuration('60 min')).toBe(60);
      expect(parseDuration('1 Stunde 30 Minuten')).toBe(90);
    });

    it('returns null for empty or invalid input', () => {
      expect(parseDuration('')).toBeNull();
      expect(parseDuration('abc')).toBeNull();
      expect(parseDuration('1 hour')).toBeNull();
    });
  });

  describe('parseGermanTime', () => {
    it('accepts colon, dot, and Uhr variants', () => {
      expect(parseGermanTime('14:30')).toEqual({ hours: 14, minutes: 30 });
      expect(parseGermanTime('14.30')).toEqual({ hours: 14, minutes: 30 });
      expect(parseGermanTime('14.30 Uhr')).toEqual({ hours: 14, minutes: 30 });
      expect(parseGermanTime('14:30 Uhr')).toEqual({ hours: 14, minutes: 30 });
      expect(parseGermanTime('6.45 Uhr')).toEqual({ hours: 6, minutes: 45 });
      expect(parseGermanTime('16 Uhr')).toEqual({ hours: 16, minutes: 0 });
      expect(parseGermanTime('16')).toEqual({ hours: 16, minutes: 0 });
      expect(parseGermanTime('1430')).toEqual({ hours: 14, minutes: 30 });
    });

    it('returns null for invalid times', () => {
      expect(parseGermanTime('')).toBeNull();
      expect(parseGermanTime('25:00')).toBeNull();
      expect(parseGermanTime('14:61')).toBeNull();
    });
  });

  describe('worksheet duration examples', () => {
    it('6.45 Uhr → 7.30 Uhr is 45 min', () => {
      const duration = timeToMinutes(7, 30) - timeToMinutes(6, 45);
      expect(duration).toBe(45);
      expect(isDurationCorrect('45 min', duration)).toBeTrue();
      expect(isDurationCorrect('45', duration)).toBeTrue();
    });

    it('14.50 Uhr → 15.10 Uhr is 20 min', () => {
      const duration = timeToMinutes(15, 10) - timeToMinutes(14, 50);
      expect(duration).toBe(20);
      expect(isDurationCorrect('20 min', duration)).toBeTrue();
    });

    it('16 Uhr → 17.30 Uhr is 1 h 30 min', () => {
      const duration = timeToMinutes(17, 30) - timeToMinutes(16, 0);
      expect(duration).toBe(90);
      expect(isDurationCorrect('1 h 30 min', duration)).toBeTrue();
      expect(isDurationCorrect('90 min', duration)).toBeTrue();
    });

    it('13.30 Uhr → 18 Uhr is 4 h 30 min', () => {
      const duration = timeToMinutes(18, 0) - timeToMinutes(13, 30);
      expect(duration).toBe(270);
      expect(isDurationCorrect('4 h 30 min', duration)).toBeTrue();
    });
  });

  describe('worksheet delay examples', () => {
    it('14.20 Uhr + 10 Minuten → 14.30', () => {
      const next = addMinutesToTime(14, 20, 10);
      expect(next).toEqual({ hours: 14, minutes: 30 });
      expect(isTimeCorrect('14:30', next.hours, next.minutes)).toBeTrue();
      expect(isTimeCorrect('14.30', next.hours, next.minutes)).toBeTrue();
    });

    it('15.30 Uhr + 45 Minuten → 16.15', () => {
      const next = addMinutesToTime(15, 30, 45);
      expect(next).toEqual({ hours: 16, minutes: 15 });
      expect(isTimeCorrect('16:15', next.hours, next.minutes)).toBeTrue();
    });

    it('16.21 Uhr + 60 Minuten → 17.21', () => {
      const next = addMinutesToTime(16, 21, 60);
      expect(next).toEqual({ hours: 17, minutes: 21 });
      expect(isTimeCorrect('17:21', next.hours, next.minutes)).toBeTrue();
      expect(isTimeCorrect('17.21 Uhr', next.hours, next.minutes)).toBeTrue();
    });
  });

  describe('addMinutesToTime', () => {
    it('wraps past midnight', () => {
      expect(addMinutesToTime(23, 50, 20)).toEqual({ hours: 0, minutes: 10 });
    });
  });
});

describe('DurationService', () => {
  let service: DurationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(DurationService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('generates many unique valid Zeitspannen', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) {
      const problem = service.generateZeitspanne();
      expect(problem.kind).toBe('zeitspanne');
      expect(problem.durationMinutes).toBeGreaterThan(0);
      expect(problem.startHours).toBeGreaterThanOrEqual(0);
      expect(problem.endHours).toBeLessThan(24);
      const expected =
        timeToMinutes(problem.endHours, problem.endMinutes) -
        timeToMinutes(problem.startHours, problem.startMinutes);
      expect(problem.durationMinutes).toBe(expected);
      seen.add(
        `${problem.startHours}:${problem.startMinutes}-${problem.endHours}:${problem.endMinutes}`
      );
    }
    expect(seen.size).toBeGreaterThan(20);
  });

  it('generates many unique valid Verspätung problems', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) {
      const problem = service.generateVerspaetung();
      expect(problem.kind).toBe('verspaetung');
      expect(problem.delayMinutes).toBeGreaterThan(0);
      expect(problem.destination.length).toBeGreaterThan(0);
      const next = addMinutesToTime(
        problem.scheduledHours,
        problem.scheduledMinutes,
        problem.delayMinutes
      );
      expect(problem.newHours).toBe(next.hours);
      expect(problem.newMinutes).toBe(next.minutes);
      seen.add(
        `${problem.scheduledHours}:${problem.scheduledMinutes}+${problem.delayMinutes}:${problem.destination}`
      );
    }
    expect(seen.size).toBeGreaterThan(20);
  });

  it('generateProblem dispatches by kind', () => {
    expect(service.generateProblem('zeitspanne').kind).toBe('zeitspanne');
    expect(service.generateProblem('verspaetung').kind).toBe('verspaetung');
  });

  it('exposes German labels', () => {
    expect(service.getTypeLabel('zeitspanne')).toBe('Zeitspannen');
    expect(service.getTypeLabel('verspaetung')).toBe('Verspätung');
  });
});
