import { test, expect } from '@playwright/test';
import { bypassLogin, handleMigrationDialog } from './helpers';

test.describe('Mathe Sachaufgaben', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
  });

  test('should show word problem exercise page', async ({ page }) => {
    await page.goto('/mathe/sachaufgaben');

    await expect(page.locator('.type-selector')).toBeVisible();
    await expect(page.locator('.story-display')).toBeVisible();
  });

  test('should show type selector with math operations', async ({ page }) => {
    await page.goto('/mathe/sachaufgaben');

    await expect(page.locator('.type-btn').first()).toBeVisible();
    // Should have 4 type buttons
    await expect(page.locator('.type-btn')).toHaveCount(4);
  });

  test('should not show range selector buttons (Zahlenraum is set on Mathe overview)', async ({ page }) => {
    await page.goto('/mathe/sachaufgaben');

    await expect(page.locator('.range-selector')).not.toBeVisible();
  });

  test('should display a word problem', async ({ page }) => {
    await page.goto('/mathe/sachaufgaben');

    // Story text should be visible
    await expect(page.locator('.story-text')).toBeVisible();
    // Story icon should be visible
    await expect(page.locator('.story-icon')).toBeVisible();
  });

  test('should answer a word problem', async ({ page }) => {
    await page.goto('/mathe/sachaufgaben');

    // Wait for story to load
    await expect(page.locator('.story-text')).toBeVisible();

    // Enter a number via keypad
    await page.locator('.keypad button', { hasText: '5' }).click();
    await page.locator('.btn-ok').click();

    // Feedback should appear
    await expect(page.locator('.feedback-correct, .feedback-incorrect')).toBeVisible({ timeout: 2000 });
  });
});