import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AvatarService } from '../../services/avatar.service';
import { DailyStreakService } from '../../services/daily-streak.service';
import type { AvatarStyle } from '../../models/user.model';

/**
 * User profile component for header display
 * Shows avatar, username, current streak, and logout option
 */
@Component({
  standalone: true,
  selector: 'app-user-profile',
  imports: [],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss',
})
export class UserProfileComponent {
  protected auth = inject(AuthService);
  protected avatarService = inject(AvatarService);
  protected streakService = inject(DailyStreakService);
  private router = inject(Router);

  // Computed values
  user = this.auth.currentUser;
  currentStreak = this.streakService.currentStreak;
  longestStreak = this.streakService.longestStreak;

  // Check if current streak is at a milestone
  isAtMilestone = computed(() => {
    const streak = this.currentStreak();
    const milestones = this.streakService.MILESTONES;
    return milestones.includes(streak as (typeof milestones)[number]);
  });

  // Get avatar URL
  getAvatarUrl = computed(() => {
    const currentUser = this.user();
    if (!currentUser) return '';
    return this.avatarService.generateAvatarUrl(
      currentUser.username,
      currentUser.avatar_style as AvatarStyle
    );
  });

  /**
   * Switch user - logout and redirect to login page
   */
  async switchUser(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
