import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AvatarService } from './avatar.service';
import type { AvatarStyle } from '../models/user.model';

describe('AvatarService', () => {
  let service: AvatarService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), AvatarService],
    });
    service = TestBed.inject(AvatarService);
  });

  // ─── Initial State ──────────────────────────────────────────

  describe('avatar styles', () => {
    it('should have 6 available styles', () => {
      expect(service.AVATAR_STYLES.length).toBe(6);
    });

    it('should include adventurer style', () => {
      expect(service.AVATAR_STYLES).toContain('adventurer');
    });

    it('should include pixel-art style', () => {
      expect(service.AVATAR_STYLES).toContain('pixel-art');
    });
  });

  // ─── generateAvatarUrl ──────────────────────────────────────

  describe('generateAvatarUrl', () => {
    it('should return deterministic URL for same username', () => {
      const url1 = service.generateAvatarUrl('testuser');
      const url2 = service.generateAvatarUrl('testuser');
      expect(url1).toBe(url2);
    });

    it('should encode special characters in username', () => {
      const url = service.generateAvatarUrl('user name+test');
      expect(url).toContain(encodeURIComponent('user name+test'));
    });

    it('should use adventurer as default style', () => {
      const url = service.generateAvatarUrl('testuser');
      expect(url).toContain('/adventurer/');
    });

    it('should use specified style', () => {
      const url = service.generateAvatarUrl('testuser', 'bottts');
      expect(url).toContain('/bottts/');
    });

    it('should use dicebear API base URL', () => {
      const url = service.generateAvatarUrl('testuser');
      expect(url).toContain('api.dicebear.com');
    });

    it('should generate different URLs for different styles', () => {
      const url1 = service.generateAvatarUrl('test', 'adventurer');
      const url2 = service.generateAvatarUrl('test', 'pixel-art');
      expect(url1).not.toBe(url2);
    });
  });

  // ─── getAvailableStyles ─────────────────────────────────────

  describe('getAvailableStyles', () => {
    it('should return all avatar styles', () => {
      const styles = service.getAvailableStyles();
      expect(styles.length).toBe(6);
    });
  });

  // ─── getStyleLabel ──────────────────────────────────────────

  describe('getStyleLabel', () => {
    it('should return German label for adventurer', () => {
      expect(service.getStyleLabel('adventurer')).toBe('Abenteurer');
    });

    it('should return German label for avataaars', () => {
      expect(service.getStyleLabel('avataaars')).toBe('Cartoon');
    });

    it('should return German label for fun-emoji', () => {
      expect(service.getStyleLabel('fun-emoji')).toBe('Emoji');
    });

    it('should return German label for bottts', () => {
      expect(service.getStyleLabel('bottts')).toBe('Roboter');
    });

    it('should return German label for lorelei', () => {
      expect(service.getStyleLabel('lorelei')).toBe('Portrait');
    });

    it('should return German label for pixel-art', () => {
      expect(service.getStyleLabel('pixel-art')).toBe('Pixel Art');
    });

    it('should return style name as fallback for unknown style', () => {
      expect(service.getStyleLabel('unknown' as AvatarStyle)).toBe('unknown');
    });
  });

  // ─── getRandomStyle ─────────────────────────────────────────

  describe('getRandomStyle', () => {
    it('should return a valid avatar style', () => {
      const style = service.getRandomStyle();
      expect(service.AVATAR_STYLES).toContain(style);
    });
  });

  // ─── generatePreviewUrl ─────────────────────────────────────

  describe('generatePreviewUrl', () => {
    it('should generate URL with style and seed', () => {
      const url = service.generatePreviewUrl('testuser', 'adventurer');
      expect(url).toContain('/adventurer/');
      expect(url).toContain('seed=' + encodeURIComponent('testuser'));
    });

    it('should use preview as fallback seed when username is empty', () => {
      const url = service.generatePreviewUrl('', 'adventurer');
      expect(url).toContain('seed=preview');
    });

    it('should append custom options when provided', () => {
      const url = service.generatePreviewUrl('test', 'adventurer', 'backgroundColor=blue');
      expect(url).toContain('&backgroundColor=blue');
    });

    it('should not append options when not provided', () => {
      const url = service.generatePreviewUrl('test', 'adventurer');
      expect(url).not.toContain('&');
    });
  });
});
