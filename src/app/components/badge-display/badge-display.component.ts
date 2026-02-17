import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeService } from '../../services/badge.service';
import { StatsService } from '../../services/stats.service';
import { AuthService } from '../../services/auth.service';
import { DailyStreakService } from '../../services/daily-streak.service';
import { SupabaseService } from '../../services/supabase.service';
import type { BadgeProgress, BadgeCategory } from '../../models/badge.model';

@Component({
  selector: 'app-badge-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badge-display.component.html',
  styleUrl: './badge-display.component.scss',
})
export class BadgeDisplayComponent implements OnInit {
  private badgeService = inject(BadgeService);
  private statsService = inject(StatsService);
  private authService = inject(AuthService);
  private streakService = inject(DailyStreakService);
  private supabase = inject(SupabaseService);

  // Signals
  badgesWithProgress = signal<BadgeProgress[]>([]);
  isLoading = signal(true);

  // Computed - group badges by category
  performanceBadges = computed(() =>
    this.badgesWithProgress().filter(b => b.badge.category === 'performance')
  );
  consistencyBadges = computed(() =>
    this.badgesWithProgress().filter(b => b.badge.category === 'consistency')
  );
  milestoneBadges = computed(() =>
    this.badgesWithProgress().filter(b => b.badge.category === 'milestone')
  );
  challengeBadges = computed(() =>
    this.badgesWithProgress().filter(b => b.badge.category === 'challenge')
  );

  // Stats for display
  totalBadges = computed(() => this.badgesWithProgress().length);
  earnedBadges = computed(() => this.badgesWithProgress().filter(b => b.earned).length);
  totalCoinsFromBadges = computed(() =>
    this.badgesWithProgress()
      .filter(b => b.earned)
      .reduce((sum, b) => sum + b.badge.coinReward, 0)
  );

  async ngOnInit() {
    await this.loadBadgeProgress();
  }

  async loadBadgeProgress() {
    this.isLoading.set(true);

    try {
      const user = this.authService.currentUser();
      if (!user) {
        this.isLoading.set(false);
        return;
      }

      // Gather badge check data
      const checkData = await this.gatherBadgeCheckData(user.id);

      // Get all badges with progress
      const badges = this.badgeService.getAllBadgesWithProgress(checkData);
      this.badgesWithProgress.set(badges);
    } catch (error) {
      console.error('Error loading badge progress:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async gatherBadgeCheckData(userId: string) {
    // Get mastery data
    const masteryRecords = await this.supabase.getMastery(userId);
    const masteredReihen = masteryRecords
      .filter(m => m.mastered)
      .map(m => m.reihe);

    // Get time trial bests
    const timeTrialBests = await this.supabase.getPersonalBests(userId);

    // Get streak data
    const streakData = await this.supabase.getDailyStreak(userId);

    return {
      lifetimeStats: this.statsService.lifetimeStatsByType(),
      dailyStats: this.statsService.statsByType(),
      currentStreak: streakData.current_streak,
      longestStreak: streakData.longest_streak,
      bestStreaksByType: this.statsService.bestStreaksByType(),
      timeTrialBests,
      masteredReihen,
    };
  }

  getCategoryTitle(category: BadgeCategory): string {
    const titles: Record<BadgeCategory, string> = {
      performance: 'Leistung',
      consistency: 'Beständigkeit',
      milestone: 'Meilensteine',
      challenge: 'Herausforderungen',
    };
    return titles[category];
  }

  getCategoryIcon(category: BadgeCategory): string {
    const icons: Record<BadgeCategory, string> = {
      performance: '⚡',
      consistency: '🔥',
      milestone: '🏆',
      challenge: '🎯',
    };
    return icons[category];
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
