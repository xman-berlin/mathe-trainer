import { test, expect } from '@playwright/test';
import { bypassLogin, handleMigrationDialog } from './helpers';

test.describe('Homepage (Übungsplan CTA removed)', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
    await page.goto('/');
    await handleMigrationDialog(page);
  });

  test('should show category choice without Übung starten', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Wähle eine Kategorie' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Übung starten' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Weiterüben' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Mathe' })).toBeVisible();
  });
});
