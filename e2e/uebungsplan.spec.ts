import { test, expect } from '@playwright/test';
import { bypassLogin, handleMigrationDialog } from './helpers';

test.describe('Übungsplan', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
    await page.goto('/');
    await handleMigrationDialog(page);
  });

  test('should start plan from home and open mathe with types locked', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Übung starten' })).toBeVisible();

    await page.getByRole('button', { name: 'Übung starten' }).click();

    await expect(page).toHaveURL(/\/mathe\/uebung$/);
    await expect(page.locator('.plan-progress-banner')).toContainText(/Mathe \d+\/\d+/);
    await expect(page.locator('.type-toggle')).toHaveCount(0);
    await expect(page.locator('.problem-display')).toBeVisible();
  });

  test('should resume active plan from home via Weiterüben', async ({ page }) => {
    await page.getByRole('button', { name: 'Übung starten' }).click();
    await expect(page).toHaveURL(/\/mathe\/uebung$/);

    // Leave via back (keeps session state); full reload would clear the in-memory plan
    await page.locator('a.back-home-btn').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Übungsplan läuft' })).toBeVisible();
    await page.getByRole('button', { name: 'Weiterüben' }).click();

    await expect(page).toHaveURL(/\/mathe\/uebung$/);
    await expect(page.locator('.plan-progress-banner')).toContainText(/Mathe \d+\/\d+/);
  });

  test('should go home via back when plan is guiding, then category back when paused', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Übung starten' }).click();
    await expect(page).toHaveURL(/\/mathe\/uebung$/);

    await page.locator('a.back-home-btn').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Übungsplan läuft' })).toBeVisible();

    await page.getByRole('link', { name: 'Mathe' }).click();
    await page.getByRole('link', { name: 'Übung' }).click();
    await expect(page).toHaveURL(/\/mathe\/uebung$/);
    await expect(page.locator('.type-toggle').first()).toBeVisible();

    await page.locator('a.back-home-btn').click();
    await expect(page).toHaveURL(/\/mathe$/);
  });
});
