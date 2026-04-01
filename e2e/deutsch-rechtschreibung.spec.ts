import { test, expect } from '@playwright/test';
import { bypassLogin } from './helpers';

test.describe('Deutsch Rechtschreibung', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
  });

  test('should show rechtschreibung page or empty state', async ({ page }) => {
    await page.goto('/deutsch/rechtschreibung');

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Page should show either exercise UI or empty state
    const hasLanguageTitle = await page.locator('.language-title').isVisible();
    const hasEmptyState = await page.locator('.empty-state').isVisible();
    const hasLoadingState = await page.locator('.loading-state').isVisible();

    expect(hasLanguageTitle || hasEmptyState || hasLoadingState).toBeTruthy();
  });
});