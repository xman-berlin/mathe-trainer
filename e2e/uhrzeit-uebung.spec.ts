import { test, expect } from '@playwright/test';
import { bypassLogin } from './helpers';

test.describe('Uhrzeit Übung', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
  });

  test('should show exercise page with type selector', async ({ page }) => {
    await page.goto('/uhrzeit/uebung');

    await expect(page.locator('.type-selector')).toBeVisible();
    await expect(page.locator('.type-btn')).toHaveCount(4);
  });

  test('should display a clock', async ({ page }) => {
    await page.goto('/uhrzeit/uebung');

    await expect(page.locator('.clock-svg')).toBeVisible();
    await expect(page.locator('.clock-face')).toBeVisible();
    await expect(page.locator('.hour-hand')).toBeVisible();
    // Minute hand may not be visible in all states
  });

  test('should show time input and keypad', async ({ page }) => {
    await page.goto('/uhrzeit/uebung');

    await expect(page.locator('.time-input')).toBeVisible();
    await expect(page.locator('.keypad')).toBeVisible();
    await expect(page.locator('.btn-ok')).toBeVisible();
  });

  test('should answer a time question', async ({ page }) => {
    await page.goto('/uhrzeit/uebung');

    // Enter time via keypad (e.g., 10:00)
    await page.locator('.keypad button', { hasText: '1' }).click();
    await page.locator('.keypad button', { hasText: '0' }).click();
    await page.locator('.keypad button', { hasText: '0' }).click();
    await page.locator('.keypad button', { hasText: '0' }).click();
    await page.locator('.btn-ok').click();

    // Check feedback
    await expect(page.locator('.feedback-area .feedback')).toBeVisible({ timeout: 3000 });
  });

  test('should show time of day indicators', async ({ page }) => {
    await page.goto('/uhrzeit/uebung');

    await expect(page.locator('.time-indicator')).toHaveCount(2);
  });
});