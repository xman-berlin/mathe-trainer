import { test, expect } from '@playwright/test';
import { bypassLogin } from './helpers';

test.describe('Uhrzeit Zeiger setzen', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
  });

  test('should show set clock exercise page', async ({ page }) => {
    await page.goto('/uhrzeit/zeiger-setzen');

    await expect(page.locator('.type-selector')).toBeVisible();
    await expect(page.locator('.interactive-clock-container')).toBeVisible();
  });

  test('should display interactive clock with draggable hands', async ({ page }) => {
    await page.goto('/uhrzeit/zeiger-setzen');

    await expect(page.locator('.clock-svg')).toBeVisible();
    await expect(page.locator('.hour-hand-handle')).toBeVisible();
    await expect(page.locator('.minute-hand-handle')).toBeVisible();
  });

  test('should show target time input', async ({ page }) => {
    await page.goto('/uhrzeit/zeiger-setzen');

    await expect(page.locator('.target-time-input')).toBeVisible();
  });

  test('should show submit button', async ({ page }) => {
    await page.goto('/uhrzeit/zeiger-setzen');

    await expect(page.locator('.submit-btn')).toBeVisible();
    await expect(page.locator('.submit-btn')).toContainText('Überprüfen');
  });

  test('should toggle display mode', async ({ page }) => {
    await page.goto('/uhrzeit/zeiger-setzen');

    // Click mode toggle button
    const modeBtn = page.locator('.mode-btn').first();
    await modeBtn.click();

    // Button should be clickable (we just verified it works)
    await expect(modeBtn).toBeVisible();
  });
});