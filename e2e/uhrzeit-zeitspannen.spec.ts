import { test, expect } from '@playwright/test';
import { bypassLogin } from './helpers';

test.describe('Uhrzeit Zeitpunkte und Zeitspannen', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
  });

  test('should show type selector and Zeitspannen layout', async ({ page }) => {
    await page.goto('/uhrzeit/zeitpunkte-zeitspannen');

    await expect(page.locator('.type-selector')).toBeVisible();
    await expect(page.locator('.type-btn')).toHaveCount(2);

    await page.getByRole('button', { name: /Verspätung/ }).click();

    await expect(page.getByRole('heading', { name: 'Wie viele Minuten sind vergangen?' })).toBeVisible();
    await expect(page.locator('.span-row')).toBeVisible();
    await expect(page.locator('.duration-field')).toHaveCount(2);
    await expect(page.locator('.keypad')).toBeVisible();
  });

  test('should switch to Verspätung and show bus card', async ({ page }) => {
    await page.goto('/uhrzeit/zeitpunkte-zeitspannen');

    await page.getByRole('button', { name: /Zeitspannen/ }).click();
    await expect(page.getByRole('heading', { name: 'Oh nein, Verspätung!' })).toBeVisible();
    await expect(page.locator('.bus-card')).toBeVisible();
    await expect(page.locator('.time-input')).toBeVisible();
  });

  test('should submit a Zeitspannen answer and show feedback', async ({ page }) => {
    await page.goto('/uhrzeit/zeitpunkte-zeitspannen');

    await page.getByRole('button', { name: /Verspätung/ }).click();
    await page.getByRole('button', { name: 'Minuten eingeben' }).click();
    await page.locator('.keypad button', { hasText: '4' }).click();
    await page.locator('.keypad button', { hasText: '5' }).click();
    await page.locator('.btn-ok').click();

    await expect(page.locator('.feedback-area .feedback')).toBeVisible({ timeout: 3000 });
  });

  test('should submit a Verspätung time and show feedback', async ({ page }) => {
    await page.goto('/uhrzeit/zeitpunkte-zeitspannen');

    await page.getByRole('button', { name: /Zeitspannen/ }).click();
    await expect(page.locator('.time-input')).toBeVisible();

    await page.locator('.keypad button', { hasText: '1' }).click();
    await page.locator('.keypad button', { hasText: '4' }).click();
    await page.locator('.keypad button', { hasText: '3' }).click();
    await page.locator('.keypad button', { hasText: '0' }).click();
    await page.locator('.btn-ok').click();

    await expect(page.locator('.feedback-area .feedback')).toBeVisible({ timeout: 3000 });
  });
});
