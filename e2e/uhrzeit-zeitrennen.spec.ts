import { test, expect } from '@playwright/test';
import { bypassLogin } from './helpers';

test.describe('Uhrzeit Zeitrennen', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
  });

  test('should show start button and description', async ({ page }) => {
    await page.goto('/uhrzeit/zeitrennen');

    await expect(page.locator('.start-trial-btn')).toBeVisible();
    await expect(page.locator('.trial-description')).toContainText('60 Sekunden');
  });

  test('should start time trial and show timer', async ({ page }) => {
    await page.goto('/uhrzeit/zeitrennen');

    // Start the time trial
    await page.locator('.start-trial-btn').click();

    // Timer should be visible
    await expect(page.locator('.timer-display')).toBeVisible();
    await expect(page.locator('.timer-value')).toContainText('60');
  });

  test('should show clock during time trial', async ({ page }) => {
    await page.goto('/uhrzeit/zeitrennen');

    // Start the time trial
    await page.locator('.start-trial-btn').click();

    // Clock should be visible
    await expect(page.locator('.clock-svg')).toBeVisible();
  });
});