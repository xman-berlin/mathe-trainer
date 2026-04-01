import { test, expect } from '@playwright/test';
import { bypassLogin } from './helpers';

test.describe('Deutsch Verwalten', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
  });

  test('should show vocab management page', async ({ page }) => {
    await page.goto('/deutsch/verwalten');

    await expect(page.locator('.left-panel')).toBeVisible();
    await expect(page.locator('.right-panel')).toBeVisible();
  });

  test('should show lists panel', async ({ page }) => {
    await page.goto('/deutsch/verwalten');

    await expect(page.locator('h2', { hasText: 'Listen' })).toBeVisible();
  });

  test('should show add list form', async ({ page }) => {
    await page.goto('/deutsch/verwalten');

    await expect(page.locator('.add-form')).toBeVisible();
    await expect(page.locator('.add-form .text-input')).toBeVisible();
    await expect(page.locator('.add-form .primary-btn')).toBeVisible();
  });

  test('should show back link', async ({ page }) => {
    await page.goto('/deutsch/verwalten');

    await expect(page.locator('.back-link')).toBeVisible();
  });
});