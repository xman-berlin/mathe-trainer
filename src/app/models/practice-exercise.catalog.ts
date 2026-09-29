/**
 * Shared catalog of practice exercise tiles that have configurable daily goals.
 * Hangman / games / Zeitrennen / Verwalten are intentionally omitted.
 */

export type PracticeCategory = 'math' | 'clock' | 'deutsch' | 'englisch';

export interface PracticeExerciseTile {
  id: string;
  category: PracticeCategory;
  title: string;
  route: string;
  defaultDailyGoal: number;
  /** Exact statsByType keys that count toward this tile's daily progress */
  statsKeys: readonly string[];
}

export const PRACTICE_EXERCISE_CATALOG: readonly PracticeExerciseTile[] = [
  {
    id: 'math-uebung',
    category: 'math',
    title: 'Übung',
    route: '/mathe/uebung',
    defaultDailyGoal: 15,
    statsKeys: ['addition', 'subtraction', 'multiplication', 'division'],
  },
  {
    id: 'math-sachaufgaben',
    category: 'math',
    title: 'Sachaufgaben',
    route: '/mathe/sachaufgaben',
    defaultDailyGoal: 5,
    statsKeys: ['word-problems'],
  },
  {
    id: 'clock-uebung',
    category: 'clock',
    title: 'Übung',
    route: '/uhrzeit/uebung',
    defaultDailyGoal: 10,
    statsKeys: ['clock-full', 'clock-half', 'clock-quarter', 'clock-fiveMin'],
  },
  {
    id: 'clock-zeiger',
    category: 'clock',
    title: 'Zeiger setzen',
    route: '/uhrzeit/zeiger-setzen',
    defaultDailyGoal: 5,
    statsKeys: [
      'clock-setClock-full',
      'clock-setClock-half',
      'clock-setClock-quarter',
      'clock-setClock-fiveMin',
      'clock-setClock-fiveMinAfter',
      'clock-setClock-fiveMinBefore',
      'clock-setClock-fiveMinHalf',
    ],
  },
  {
    id: 'clock-zeitspannen',
    category: 'clock',
    title: 'Zeitpunkte & Zeitspannen',
    route: '/uhrzeit/zeitpunkte-zeitspannen',
    defaultDailyGoal: 5,
    statsKeys: ['clock-zeitspanne', 'clock-verspaetung'],
  },
  {
    id: 'deutsch-rechtschreibung',
    category: 'deutsch',
    title: 'Rechtschreibung',
    route: '/deutsch/rechtschreibung',
    defaultDailyGoal: 10,
    statsKeys: ['deutsch-rechtschreibung'],
  },
  {
    id: 'deutsch-wochentage',
    category: 'deutsch',
    title: 'Wochentage',
    route: '/deutsch/wochentage',
    defaultDailyGoal: 5,
    statsKeys: ['deutsch-wochentage'],
  },
  {
    id: 'deutsch-monate',
    category: 'deutsch',
    title: 'Monate',
    route: '/deutsch/monate',
    defaultDailyGoal: 5,
    statsKeys: ['deutsch-monate'],
  },
  {
    id: 'deutsch-alphabet',
    category: 'deutsch',
    title: 'Alphabet',
    route: '/deutsch/alphabet',
    defaultDailyGoal: 5,
    statsKeys: ['deutsch-alphabet'],
  },
  {
    id: 'englisch-uebersetzung',
    category: 'englisch',
    title: 'Übersetzung',
    route: '/englisch/uebung',
    defaultDailyGoal: 20,
    statsKeys: ['englisch-uebersetzung'],
  },
] as const;

export function catalogDefaults(): Record<string, number> {
  const defaults: Record<string, number> = {};
  for (const tile of PRACTICE_EXERCISE_CATALOG) {
    defaults[tile.id] = tile.defaultDailyGoal;
  }
  return defaults;
}

export function tilesForCategory(category: PracticeCategory): PracticeExerciseTile[] {
  return PRACTICE_EXERCISE_CATALOG.filter((t) => t.category === category);
}

export function clampDailyGoal(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(100, Math.max(1, Math.round(value)));
}

export function mergeGoalsWithDefaults(
  stored: Record<string, number> | null | undefined
): Record<string, number> {
  const merged = catalogDefaults();
  if (!stored) return merged;
  for (const tile of PRACTICE_EXERCISE_CATALOG) {
    const raw = stored[tile.id];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      merged[tile.id] = clampDailyGoal(raw);
    }
  }
  return merged;
}

export function sumGoalsForCategory(
  goals: Record<string, number>,
  category: PracticeCategory
): number {
  return tilesForCategory(category).reduce((sum, tile) => sum + (goals[tile.id] ?? tile.defaultDailyGoal), 0);
}

export function correctCountForTile(
  byType: Record<string, { correct?: number; incorrect?: number }>,
  tile: PracticeExerciseTile
): number {
  return tile.statsKeys.reduce((sum, key) => sum + (byType[key]?.correct ?? 0), 0);
}

export function correctCountForCategory(
  byType: Record<string, { correct?: number; incorrect?: number }>,
  category: PracticeCategory
): number {
  return tilesForCategory(category).reduce((sum, tile) => sum + correctCountForTile(byType, tile), 0);
}

/**
 * Progress toward category roll-up: per-tile correct capped at that tile's goal
 * so extra Übung answers don't fill Sachaufgaben.
 */
export function cappedCorrectCountForCategory(
  byType: Record<string, { correct?: number; incorrect?: number }>,
  goals: Record<string, number>,
  category: PracticeCategory
): number {
  return tilesForCategory(category).reduce((sum, tile) => {
    const goal = goals[tile.id] ?? tile.defaultDailyGoal;
    return sum + Math.min(correctCountForTile(byType, tile), goal);
  }, 0);
}

/** Category daily goal is reached only when every tile goal is met. */
export function allTileGoalsReached(
  byType: Record<string, { correct?: number; incorrect?: number }>,
  goals: Record<string, number>,
  category: PracticeCategory
): boolean {
  return tilesForCategory(category).every((tile) => {
    const goal = goals[tile.id] ?? tile.defaultDailyGoal;
    return correctCountForTile(byType, tile) >= goal;
  });
}

export function findTileById(id: string): PracticeExerciseTile | undefined {
  return PRACTICE_EXERCISE_CATALOG.find((t) => t.id === id);
}
