import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('should show login page with welcome message', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('Willkommen bei Schlaufuchs!')).toBeVisible();
    await expect(page.getByText('Wähle deinen Charakter')).toBeVisible();
  });

  test('should show migration dialog on first visit', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('Willkommen zur neuen Version!')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Frisch beginnen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mit meinen Daten starten' })).toBeVisible();
  });
});