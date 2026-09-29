import { test, expect } from '@playwright/test';
import { bypassLogin, handleMigrationDialog } from './helpers';

test.describe('Tagesziele pro Übung', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
    await page.goto('/');
    await handleMigrationDialog(page);
  });

  test('home shows roll-up goals with catalog defaults', async ({ page }) => {
    // Mathe 15+5=20, Uhrzeit 10+5+5=20, Deutsch 10+5+5+5=25, Englisch 20
    // Use card classes — /Deutsch/ also matches Englisch copy ("deutsche …").
    await expect(page.locator('a.category-card.mathe-card')).toContainText(/Ziel:\s*0\/20/);
    await expect(page.locator('a.category-card.uhrzeit-card')).toContainText(/Ziel:\s*0\/20/);
    await expect(page.locator('a.category-card.vokabeln-card')).toContainText(/Ziel:\s*0\/25/);
    await expect(page.locator('a.category-card.englisch-card')).toContainText(/Ziel:\s*0\/20/);
  });

  test('mathe overview lists per-tile goals and saves from modal', async ({ page }) => {
    await page.locator('a.category-card.mathe-card').click();
    await expect(page.getByText('Ziel: 0 / 15')).toBeVisible();
    await expect(page.getByText('Ziel: 0 / 5')).toBeVisible();

    await page.getByRole('button', { name: 'Ziele bearbeiten' }).click();
    await expect(page.getByRole('heading', { name: 'Tagesziele festlegen' })).toBeVisible();

    const inputs = page.locator('.goal-tile-row input');
    await inputs.nth(0).fill('12');
    await inputs.nth(1).fill('3');
    await page.getByRole('button', { name: 'Speichern' }).click();

    await expect(page.getByText('Ziel: 0 / 12')).toBeVisible();
    await expect(page.getByText('Ziel: 0 / 3')).toBeVisible();

    await page.getByRole('link', { name: '← Zurück' }).click();
    await expect(page.locator('a.category-card.mathe-card')).toContainText(/Ziel:\s*0\/15/);
  });
});
