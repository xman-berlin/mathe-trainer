import {
  PRACTICE_EXERCISE_CATALOG,
  allTileGoalsReached,
  catalogDefaults,
  cappedCorrectCountForCategory,
  clampDailyGoal,
  correctCountForCategory,
  mergeGoalsWithDefaults,
  sumGoalsForCategory,
  tilesForCategory,
} from './practice-exercise.catalog';

describe('practice-exercise.catalog', () => {
  it('should expose expected defaults', () => {
    const defaults = catalogDefaults();
    expect(defaults['math-uebung']).toBe(15);
    expect(defaults['math-sachaufgaben']).toBe(5);
    expect(defaults['clock-uebung']).toBe(10);
    expect(defaults['clock-zeiger']).toBe(5);
    expect(defaults['clock-zeitspannen']).toBe(5);
    expect(defaults['deutsch-rechtschreibung']).toBe(10);
    expect(defaults['deutsch-wochentage']).toBe(5);
    expect(defaults['deutsch-monate']).toBe(5);
    expect(defaults['deutsch-alphabet']).toBe(5);
    expect(defaults['englisch-uebersetzung']).toBe(20);
  });

  it('should not include hangman', () => {
    expect(PRACTICE_EXERCISE_CATALOG.some((t) => t.id.includes('hangman'))).toBeFalse();
  });

  it('should clamp goals', () => {
    expect(clampDailyGoal(0)).toBe(1);
    expect(clampDailyGoal(200)).toBe(100);
    expect(clampDailyGoal(12.6)).toBe(13);
  });

  it('should merge stored goals with defaults', () => {
    const merged = mergeGoalsWithDefaults({ 'math-uebung': 8 });
    expect(merged['math-uebung']).toBe(8);
    expect(merged['math-sachaufgaben']).toBe(5);
  });

  it('should sum goals and correct counts per category', () => {
    const goals = catalogDefaults();
    expect(sumGoalsForCategory(goals, 'math')).toBe(20);
    expect(tilesForCategory('deutsch').length).toBe(4);

    const byType = {
      addition: { correct: 3 },
      'word-problems': { correct: 2 },
      'deutsch-hangman': { correct: 9 },
      'deutsch-rechtschreibung': { correct: 4 },
    };
    expect(correctCountForCategory(byType, 'math')).toBe(5);
    expect(correctCountForCategory(byType, 'deutsch')).toBe(4);
  });

  it('should cap overflow and require all tiles for category goal', () => {
    const goals = catalogDefaults();
    const byType = {
      addition: { correct: 20 },
      'word-problems': { correct: 0 },
    };
    expect(cappedCorrectCountForCategory(byType, goals, 'math')).toBe(15);
    expect(allTileGoalsReached(byType, goals, 'math')).toBeFalse();

    const done = {
      addition: { correct: 15 },
      'word-problems': { correct: 5 },
    };
    expect(cappedCorrectCountForCategory(done, goals, 'math')).toBe(20);
    expect(allTileGoalsReached(done, goals, 'math')).toBeTrue();
  });
});
