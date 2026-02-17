import { Signal, computed } from '@angular/core';
import { StatsService } from '../services/stats.service';

/**
 * Creates computed signals that aggregate stats across a set of selected
 * exercise types. Eliminates the repeated computed() boilerplate in
 * ExerciseComponent, ClockExerciseComponent, and SetClockExerciseComponent.
 *
 * @param statsService  Injected StatsService instance
 * @param selectedTypes Signal<Set<string>> of currently selected exercise types
 * @param keyPrefix     Optional prefix added to each type key when looking up
 *                      statsByType (e.g. 'clock-' or 'clock-setClock-')
 *
 * Usage:
 *   const stats = createStatsAggregator(this.stats, this.selectedTypes, 'clock-');
 *   // stats.correct() → sum of correct answers for all selected types
 */
export function createStatsAggregator<T extends string>(
  statsService: StatsService,
  selectedTypes: Signal<Set<T>>,
  keyPrefix = ''
) {
  return {
    correct: computed(() => {
      const byType = statsService.statsByType();
      return [...selectedTypes()].reduce(
        (sum, type) => sum + (byType[`${keyPrefix}${type}`]?.correct ?? 0),
        0
      );
    }),

    incorrect: computed(() => {
      const byType = statsService.statsByType();
      return [...selectedTypes()].reduce(
        (sum, type) => sum + (byType[`${keyPrefix}${type}`]?.incorrect ?? 0),
        0
      );
    }),

    total: computed(() => {
      const byType = statsService.statsByType();
      return [...selectedTypes()].reduce((sum, type) => {
        const t = byType[`${keyPrefix}${type}`];
        return sum + (t?.correct ?? 0) + (t?.incorrect ?? 0);
      }, 0);
    }),
  };
}
