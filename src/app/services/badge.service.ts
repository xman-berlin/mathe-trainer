import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CoinsService } from './coins.service';
import type { Badge, BadgeCheckData, UserBadge, BadgeProgress, BadgeCategory } from '../models/badge.model';

/**
 * Service for managing badges
 * Handles badge definitions, checking, and awarding
 */
@Injectable({
  providedIn: 'root',
})
export class BadgeService {
  private supabase = inject(SupabaseService);
  private coinsService = inject(CoinsService);

  // Signals
  private earnedBadges = signal<UserBadge[]>([]);
  private currentUserId = signal<string | null>(null);

  // Public computed
  public badges = computed(() => this.getAllBadges());
  public earnedBadgeIds = computed(() => this.earnedBadges().map(b => b.badge_id));

  // ============================================================================
  // BADGE DEFINITIONS
  // ============================================================================

  private readonly BADGE_DEFINITIONS: Badge[] = [
    // ========================================================================
    // PERFORMANCE BADGES
    // ========================================================================
    {
      id: 'speed-demon',
      name: 'Speed Demon',
      description: 'Löse 10 Aufgaben in unter 20 Sekunden gesamt',
      icon: '⚡',
      category: 'performance',
      requiredProgress: 10,
      coinReward: 50,
      checkFunction: (_data: BadgeCheckData) => {
        // This needs to be tracked separately during exercise
        // For now, we'll implement this later with proper timing tracking
        return false;
      },
    },
    {
      id: 'perfect-day',
      name: 'Perfect Day',
      description: '100% Genauigkeit mit mindestens 20 Aufgaben an einem Tag',
      icon: '💯',
      category: 'performance',
      requiredProgress: 20,
      coinReward: 100,
      checkFunction: (data: BadgeCheckData) => {
        let totalCorrect = 0;
        let totalIncorrect = 0;

        for (const stats of Object.values(data.dailyStats)) {
          totalCorrect += stats.correct;
          totalIncorrect += stats.incorrect;
        }

        return totalCorrect >= 20 && totalIncorrect === 0;
      },
    },
    {
      id: 'accuracy-expert',
      name: 'Accuracy Expert',
      description: 'Halte 95%+ Genauigkeit über 100 Aufgaben (lifetime)',
      icon: '🎯',
      category: 'performance',
      requiredProgress: 100,
      coinReward: 75,
      checkFunction: (data: BadgeCheckData) => {
        const totalCorrect = Object.values(data.lifetimeStats).reduce((sum, count) => sum + count, 0);
        // We need to track total attempts (correct + incorrect)
        // For now, assume 95%+ means at least 95 correct out of 100 total
        return totalCorrect >= 95;
      },
    },

    // ========================================================================
    // CONSISTENCY BADGES
    // ========================================================================
    {
      id: 'streak-7',
      name: '7-Day Streak',
      description: 'Übe 7 Tage am Stück',
      icon: '🔥',
      category: 'consistency',
      requiredProgress: 7,
      coinReward: 75,
      checkFunction: (data: BadgeCheckData) => {
        return data.currentStreak >= 7;
      },
    },
    {
      id: 'streak-30',
      name: '30-Day Streak',
      description: 'Übe 30 Tage am Stück',
      icon: '🌟',
      category: 'consistency',
      requiredProgress: 30,
      coinReward: 300,
      checkFunction: (data: BadgeCheckData) => {
        return data.currentStreak >= 30;
      },
    },
    {
      id: 'streak-100',
      name: '100-Day Streak',
      description: 'Übe 100 Tage am Stück',
      icon: '💎',
      category: 'consistency',
      requiredProgress: 100,
      coinReward: 1000,
      checkFunction: (data: BadgeCheckData) => {
        return data.currentStreak >= 100;
      },
    },
    {
      id: 'weekend-warrior',
      name: 'Weekend Warrior',
      description: 'Übe an einem Samstag UND Sonntag',
      icon: '🏖️',
      category: 'consistency',
      requiredProgress: 2,
      coinReward: 50,
      checkFunction: (_data: BadgeCheckData) => {
        // This needs day-of-week tracking
        // Implemented later with proper date tracking
        return false;
      },
    },

    // ========================================================================
    // MILESTONE BADGES
    // ========================================================================
    {
      id: 'first-steps',
      name: 'First Steps',
      description: 'Löse deine ersten 10 Aufgaben',
      icon: '👣',
      category: 'milestone',
      requiredProgress: 10,
      coinReward: 25,
      checkFunction: (data: BadgeCheckData) => {
        const total = Object.values(data.lifetimeStats).reduce((sum, count) => sum + count, 0);
        return total >= 10;
      },
    },
    {
      id: 'century',
      name: 'Century',
      description: 'Löse 100 Aufgaben (lifetime)',
      icon: '💯',
      category: 'milestone',
      requiredProgress: 100,
      coinReward: 100,
      checkFunction: (data: BadgeCheckData) => {
        const total = Object.values(data.lifetimeStats).reduce((sum, count) => sum + count, 0);
        return total >= 100;
      },
    },
    {
      id: 'half-thousand',
      name: 'Half Thousand',
      description: 'Löse 500 Aufgaben (lifetime)',
      icon: '🎖️',
      category: 'milestone',
      requiredProgress: 500,
      coinReward: 250,
      checkFunction: (data: BadgeCheckData) => {
        const total = Object.values(data.lifetimeStats).reduce((sum, count) => sum + count, 0);
        return total >= 500;
      },
    },
    {
      id: 'thousand-solved',
      name: '1000 Problems Solved',
      description: 'Löse 1000 Aufgaben (lifetime)',
      icon: '🎓',
      category: 'milestone',
      requiredProgress: 1000,
      coinReward: 500,
      checkFunction: (data: BadgeCheckData) => {
        const total = Object.values(data.lifetimeStats).reduce((sum, count) => sum + count, 0);
        return total >= 1000;
      },
    },
    {
      id: 'bronze-collector',
      name: 'Bronze Collector',
      description: 'Erreiche Bronze in allen 5 Aufgabenarten',
      icon: '🥉',
      category: 'milestone',
      requiredProgress: 5,
      coinReward: 200,
      checkFunction: (data: BadgeCheckData) => {
        // Check if all 5 main types have at least 100 correct
        const types = ['addition', 'subtraction', 'multiplication', 'division', 'word-problems'];
        return types.every(type => (data.lifetimeStats[type] || 0) >= 100);
      },
    },
    {
      id: 'silver-collector',
      name: 'Silver Collector',
      description: 'Erreiche Silber in allen 5 Aufgabenarten',
      icon: '🥈',
      category: 'milestone',
      requiredProgress: 5,
      coinReward: 500,
      checkFunction: (data: BadgeCheckData) => {
        const types = ['addition', 'subtraction', 'multiplication', 'division', 'word-problems'];
        return types.every(type => (data.lifetimeStats[type] || 0) >= 500);
      },
    },
    {
      id: 'gold-collector',
      name: 'Gold Collector',
      description: 'Erreiche Gold in allen 5 Aufgabenarten',
      icon: '🥇',
      category: 'milestone',
      requiredProgress: 5,
      coinReward: 1500,
      checkFunction: (data: BadgeCheckData) => {
        const types = ['addition', 'subtraction', 'multiplication', 'division', 'word-problems'];
        return types.every(type => (data.lifetimeStats[type] || 0) >= 1000);
      },
    },
    {
      id: 'time-trial-rookie',
      name: 'Time Trial Rookie',
      description: 'Erreiche 30+ richtig in einem Time Trial',
      icon: '⏱️',
      category: 'milestone',
      requiredProgress: 30,
      coinReward: 75,
      checkFunction: (data: BadgeCheckData) => {
        return data.timeTrialBests.some(best => best.correct_count >= 30);
      },
    },
    {
      id: 'time-trial-champion',
      name: 'Time Trial Champion',
      description: 'Erreiche 45+ richtig in einem Time Trial',
      icon: '🏆',
      category: 'milestone',
      requiredProgress: 45,
      coinReward: 150,
      checkFunction: (data: BadgeCheckData) => {
        return data.timeTrialBests.some(best => best.correct_count >= 45);
      },
    },
    {
      id: 'time-trial-legend',
      name: 'Time Trial Legend',
      description: 'Erreiche 60+ richtig in einem Time Trial',
      icon: '⚡',
      category: 'milestone',
      requiredProgress: 60,
      coinReward: 300,
      checkFunction: (data: BadgeCheckData) => {
        return data.timeTrialBests.some(best => best.correct_count >= 60);
      },
    },
    {
      id: 'multiplication-novice',
      name: 'Multiplication Novice',
      description: 'Meistere 3 Einmaleins-Reihen',
      icon: '✖️',
      category: 'milestone',
      requiredProgress: 3,
      coinReward: 100,
      checkFunction: (data: BadgeCheckData) => {
        return data.masteredReihen.length >= 3;
      },
    },
    {
      id: 'multiplication-expert',
      name: 'Multiplication Expert',
      description: 'Meistere 7 Einmaleins-Reihen',
      icon: '✖️✖️',
      category: 'milestone',
      requiredProgress: 7,
      coinReward: 250,
      checkFunction: (data: BadgeCheckData) => {
        return data.masteredReihen.length >= 7;
      },
    },
    {
      id: 'multiplication-master',
      name: 'Multiplication Master',
      description: 'Meistere alle 10 Einmaleins-Reihen',
      icon: '✖️🏆',
      category: 'milestone',
      requiredProgress: 10,
      coinReward: 400,
      checkFunction: (data: BadgeCheckData) => {
        return data.masteredReihen.length >= 10;
      },
    },
    {
      id: 'clock-beginner',
      name: 'Clock Beginner',
      description: 'Löse 50 Uhrzeit-Aufgaben (lifetime)',
      icon: '🕐',
      category: 'milestone',
      requiredProgress: 50,
      coinReward: 75,
      checkFunction: (data: BadgeCheckData) => {
        const clockTypes = ['clock-full', 'clock-half', 'clock-quarter'];
        const total = clockTypes.reduce((sum, type) => sum + (data.lifetimeStats[type] || 0), 0);
        return total >= 50;
      },
    },
    {
      id: 'clock-master',
      name: 'Clock Master',
      description: 'Löse 200 Uhrzeit-Aufgaben (lifetime)',
      icon: '🕐🏆',
      category: 'milestone',
      requiredProgress: 200,
      coinReward: 200,
      checkFunction: (data: BadgeCheckData) => {
        const clockTypes = ['clock-full', 'clock-half', 'clock-quarter'];
        const total = clockTypes.reduce((sum, type) => sum + (data.lifetimeStats[type] || 0), 0);
        return total >= 200;
      },
    },

    // ========================================================================
    // CHALLENGE BADGES (Reserved for future Daily Challenges feature)
    // ========================================================================
  ];

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Load earned badges for a user
   */
  async loadEarnedBadges(userId: string): Promise<void> {
    this.currentUserId.set(userId);

    try {
      const badges = await this.supabase.getUserBadges(userId);
      this.earnedBadges.set(badges);
    } catch (error) {
      console.error('Error loading earned badges:', error);
      this.earnedBadges.set([]);
    }
  }

  /**
   * Check and award new badges based on current data
   * Returns array of newly awarded badges
   */
  async checkAndAwardBadges(userId: string, data: BadgeCheckData): Promise<Badge[]> {
    const newlyEarnedBadges: Badge[] = [];
    const earnedIds = this.earnedBadgeIds();

    for (const badge of this.BADGE_DEFINITIONS) {
      // Skip if already earned
      if (earnedIds.includes(badge.id)) continue;

      // Check if badge criteria met
      if (badge.checkFunction(data)) {
        try {
          // Award badge in database
          await this.supabase.awardBadge(userId, badge.id);

          // Award coins
          await this.coinsService.awardCoins(userId, badge.coinReward, 'badge_earned', badge.id);

          // Update local state
          this.earnedBadges.update(badges => [
            ...badges,
            { badge_id: badge.id, earned_at: new Date().toISOString() },
          ]);

          newlyEarnedBadges.push(badge);
        } catch (error) {
          console.error(`Error awarding badge ${badge.id}:`, error);
        }
      }
    }

    return newlyEarnedBadges;
  }

  /**
   * Get progress for a specific badge
   */
  getBadgeProgress(badgeId: string, data: BadgeCheckData): { current: number; required: number } {
    const badge = this.BADGE_DEFINITIONS.find(b => b.id === badgeId);
    if (!badge) {
      return { current: 0, required: 0 };
    }

    // Calculate current progress based on badge type
    let current = 0;

    if (badgeId.startsWith('streak-')) {
      current = data.currentStreak;
    } else if (badgeId === 'first-steps' || badgeId === 'century' || badgeId === 'half-thousand' || badgeId === 'thousand-solved') {
      current = Object.values(data.lifetimeStats).reduce((sum, count) => sum + count, 0);
    } else if (badgeId === 'bronze-collector' || badgeId === 'silver-collector' || badgeId === 'gold-collector') {
      const types = ['addition', 'subtraction', 'multiplication', 'division', 'word-problems'];
      const threshold = badgeId === 'bronze-collector' ? 100 : badgeId === 'silver-collector' ? 500 : 1000;
      current = types.filter(type => (data.lifetimeStats[type] || 0) >= threshold).length;
    } else if (badgeId.startsWith('time-trial-')) {
      const threshold = badgeId === 'time-trial-rookie' ? 30 : badgeId === 'time-trial-champion' ? 45 : 60;
      const best = Math.max(0, ...data.timeTrialBests.map(b => b.correct_count));
      current = Math.min(best, threshold);
    } else if (badgeId.startsWith('multiplication-')) {
      current = data.masteredReihen.length;
    } else if (badgeId.startsWith('clock-')) {
      const clockTypes = ['clock-full', 'clock-half', 'clock-quarter'];
      current = clockTypes.reduce((sum, type) => sum + (data.lifetimeStats[type] || 0), 0);
    } else if (badgeId === 'perfect-day') {
      let totalCorrect = 0;
      for (const stats of Object.values(data.dailyStats)) {
        totalCorrect += stats.correct;
      }
      current = totalCorrect;
    }

    return { current, required: badge.requiredProgress };
  }

  /**
   * Check if badge is earned
   */
  isBadgeEarned(badgeId: string): boolean {
    return this.earnedBadgeIds().includes(badgeId);
  }

  /**
   * Get all badges with progress and earned status
   */
  getAllBadgesWithProgress(data: BadgeCheckData): BadgeProgress[] {
    const earnedIds = this.earnedBadgeIds();
    const earnedBadgesMap = new Map(
      this.earnedBadges().map(b => [b.badge_id, b.earned_at || ''])
    );

    return this.BADGE_DEFINITIONS.map(badge => {
      const { current, required } = this.getBadgeProgress(badge.id, data);
      const earned = earnedIds.includes(badge.id);

      return {
        badge,
        current,
        required,
        earned,
        earnedAt: earnedBadgesMap.get(badge.id),
        percentage: required > 0 ? Math.min(100, (current / required) * 100) : 0,
      };
    });
  }

  /**
   * Get all badge definitions
   */
  getAllBadges(): Badge[] {
    return this.BADGE_DEFINITIONS;
  }

  /**
   * Get badges by category
   */
  getBadgesByCategory(category: BadgeCategory): Badge[] {
    return this.BADGE_DEFINITIONS.filter(b => b.category === category);
  }

  /**
   * Get badge by ID
   */
  getBadgeById(badgeId: string): Badge | undefined {
    return this.BADGE_DEFINITIONS.find(b => b.id === badgeId);
  }

  /**
   * Reset badge state (for user switching)
   */
  reset(): void {
    this.earnedBadges.set([]);
    this.currentUserId.set(null);
  }
}
