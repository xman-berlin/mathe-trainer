import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { DailyStreakService } from '../../services/daily-streak.service';

/**
 * Shared component for displaying daily practice streaks
 * Shows current streak, longest streak, and progress to next milestone
 */
@Component({
  standalone: true,
  selector: 'app-streak-display',
  imports: [],
  templateUrl: './streak-display.component.html',
  styleUrl: './streak-display.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreakDisplayComponent {
  protected streakService = inject(DailyStreakService);

  // Computed values
  currentStreak = this.streakService.currentStreak;
  longestStreak = this.streakService.longestStreak;
  achievedMilestones = this.streakService.achievedMilestones;

  // Next milestone info
  nextMilestone = computed(() => this.streakService.getNextMilestone());
  daysToNextMilestone = computed(() => this.streakService.getDaysToNextMilestone());
  isAtMilestone = computed(() => this.streakService.isAtMilestone());

  // Progress percentage to next milestone
  progressPercentage = computed(() => {
    const current = this.currentStreak();
    const next = this.nextMilestone();

    if (!next) return 100; // Max milestone reached

    const previous = this.getPreviousMilestone(next);
    const range = next - previous;
    const progress = current - previous;

    return Math.min(100, Math.max(0, (progress / range) * 100));
  });

  // Get all milestone badges
  milestones = this.streakService.MILESTONES;

  /**
   * Get the previous milestone before the next one
   */
  private getPreviousMilestone(next: number): number {
    const index = this.milestones.indexOf(next as (typeof this.milestones)[number]);
    return index > 0 ? this.milestones[index - 1] : 0;
  }

  /**
   * Check if a milestone has been achieved
   */
  isMilestoneAchieved(milestone: number): boolean {
    return this.achievedMilestones().includes(milestone);
  }

  /**
   * Get emoji for milestone
   */
  getMilestoneEmoji(milestone: number): string {
    if (milestone >= 365) return '👑';
    if (milestone >= 100) return '🏆';
    if (milestone >= 50) return '⭐';
    if (milestone >= 30) return '🎖️';
    if (milestone >= 14) return '🥈';
    if (milestone >= 7) return '🥉';
    return '🔥';
  }
}
