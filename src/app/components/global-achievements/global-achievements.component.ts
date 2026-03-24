import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CoinsService } from '../../services/coins.service';
import { GameService, AVAILABLE_GAMES } from '../../services/game.service';
import { AchievementsComponent } from '../achievements/achievements.component';
import { BadgeDisplayComponent } from '../badge-display/badge-display.component';

type TabType = 'math' | 'clock' | 'badges' | 'games';

@Component({
  selector: 'app-global-achievements',
  standalone: true,
  imports: [RouterLink, AchievementsComponent, BadgeDisplayComponent],
  templateUrl: './global-achievements.component.html',
  styleUrl: './global-achievements.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalAchievementsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private coinsService = inject(CoinsService);
  readonly gameService = inject(GameService);

  // Signals
  activeTab = signal<TabType>('math');

  // Coin balance for header
  coinBalance = this.coinsService.balance;

  // Games data
  readonly games = AVAILABLE_GAMES;

  canAffordGame(gameId: string): boolean {
    return this.gameService.canAffordGame(gameId);
  }

  ngOnInit() {
    // Read tab from query params
    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe(params => {
      const tab = params['tab'] as TabType;
      if (tab && this.isValidTab(tab)) {
        this.activeTab.set(tab);
      }
    });
  }

  switchTab(tab: TabType) {
    this.activeTab.set(tab);
    // Update URL query params
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  isValidTab(tab: string): tab is TabType {
    return ['math', 'clock', 'badges', 'games'].includes(tab);
  }

  getTabLabel(tab: TabType): string {
    const labels: Record<TabType, string> = {
      math: 'Mathe',
      clock: 'Uhrzeit',
      badges: 'Badges',
      games: 'Spiele',
    };
    return labels[tab];
  }

  getTabIcon(tab: TabType): string {
    const icons: Record<TabType, string> = {
      math: '📐',
      clock: '🕐',
      badges: '🏅',
      games: '🎮',
    };
    return icons[tab];
  }
}
