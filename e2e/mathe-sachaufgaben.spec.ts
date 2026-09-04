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

  test('should show type selector with two-step and math operations', async ({ page }) => {
    await page.goto('/mathe/sachaufgaben');

    await expect(page.locator('.type-btn').first()).toBeVisible();
    await expect(page.locator('.type-btn')).toHaveCount(5);
  });

  test('should not show range selector buttons (Zahlenraum is set on Mathe overview)', async ({ page }) => {
    await page.goto('/mathe/sachaufgaben');

    await expect(page.locator('.range-selector')).not.toBeVisible();
  });

  test('should display a word problem', async ({ page }) => {
    await page.goto('/mathe/sachaufgaben');

    await expect(page.locator('.story-text')).toBeVisible();
    await expect(page.locator('.story-icon')).toBeVisible();
  });

  test('should start with the Bobbi bus-ticket worksheet template', async ({ page }) => {
    await page.goto('/mathe/sachaufgaben');

    await expect(page.locator('.story-text')).toContainText(
      'Bobbi fährt mit seinen Eltern mit dem Bus. Eine Erwachsenenkarte kostet 17€. Kinder bezahlen 6€ weniger. Wie viel muss die Familie bezahlen?'
    );
  });

  test('should show Rechnung and Antwort fields for two-step problems', async ({ page }) => {
    await page.goto('/mathe/sachaufgaben');

    await expect(page.getByText('Löse die Sachaufgaben. Schreibe die Rechnung und eine Antwort.')).toBeVisible();
    await expect(page.locator('#rechnung-input')).toBeVisible();
    await expect(page.locator('#antwort-input')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Überprüfen' })).toBeVisible();
  });

  test('should answer a two-step word problem with Rechnung and Antwort', async ({ page }) => {
    await page.goto('/mathe/sachaufgaben');

    await expect(page.locator('.story-text')).toBeVisible();
    await expect(page.locator('.story-text')).toContainText('Bobbi');
    await page.locator('#rechnung-input').fill('17 + 17 + 11 = 45');
    await page.locator('#antwort-input').fill('Die Familie bezahlt 45€.');
    await page.getByRole('button', { name: 'Überprüfen' }).click();

    await expect(page.locator('.feedback-correct')).toBeVisible({ timeout: 2000 });
  });

  test('should still allow classic one-step numeric answers', async ({ page }) => {
    await page.goto('/mathe/sachaufgaben');

    await page.getByRole('button', { name: 'Plus' }).click();
    await page.getByRole('button', { name: 'Zweistufig' }).click();

    await expect(page.locator('.answer-input')).toBeVisible();
    await page.locator('.keypad button', { hasText: '5' }).click();
    await page.locator('.btn-ok').click();

    await expect(page.locator('.feedback-correct, .feedback-incorrect')).toBeVisible({ timeout: 2000 });
  });
});