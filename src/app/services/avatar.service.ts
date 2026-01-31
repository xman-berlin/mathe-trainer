import { Injectable } from '@angular/core';
import type { AvatarStyle } from '../models/user.model';

/**
 * Service for generating avatar URLs using DiceBear API
 * DiceBear provides deterministic avatar generation - same username always gets same avatar
 */
@Injectable({
  providedIn: 'root',
})
export class AvatarService {
  private readonly DICEBEAR_BASE_URL = 'https://api.dicebear.com/7.x';

  /**
   * Available avatar styles
   */
  readonly AVATAR_STYLES: readonly AvatarStyle[] = [
    'adventurer',
    'avataaars',
    'fun-emoji',
    'lorelei',
    'bottts',
    'pixel-art',
  ] as const;

  /**
   * Display names for avatar styles (for UI)
   */
  private readonly STYLE_LABELS: Record<AvatarStyle, string> = {
    adventurer: 'Abenteurer',
    avataaars: 'Cartoon',
    'fun-emoji': 'Emoji',
    lorelei: 'Portrait',
    bottts: 'Roboter',
    'pixel-art': 'Pixel Art',
  };

  /**
   * Generate avatar URL for a username
   * @param username - The username to generate avatar for
   * @param style - Avatar style (default: 'adventurer')
   * @returns Complete URL to avatar SVG
   */
  generateAvatarUrl(username: string, style: AvatarStyle = 'adventurer'): string {
    const seed = encodeURIComponent(username);
    return `${this.DICEBEAR_BASE_URL}/${style}/svg?seed=${seed}`;
  }

  /**
   * Get all available avatar styles
   */
  getAvailableStyles(): readonly AvatarStyle[] {
    return this.AVATAR_STYLES;
  }

  /**
   * Get display label for an avatar style
   */
  getStyleLabel(style: AvatarStyle): string {
    return this.STYLE_LABELS[style] || style;
  }

  /**
   * Get a random avatar style
   */
  getRandomStyle(): AvatarStyle {
    const randomIndex = Math.floor(Math.random() * this.AVATAR_STYLES.length);
    return this.AVATAR_STYLES[randomIndex];
  }

  /**
   * Generate preview URL with custom options (for create user modal)
   */
  generatePreviewUrl(username: string, style: AvatarStyle, options?: string): string {
    const seed = encodeURIComponent(username || 'preview');
    const baseUrl = `${this.DICEBEAR_BASE_URL}/${style}/svg?seed=${seed}`;
    return options ? `${baseUrl}&${options}` : baseUrl;
  }
}
