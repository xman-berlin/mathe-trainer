import { test, expect, type Page } from '@playwright/test';
import { bypassLogin } from './helpers';

/**
 * Both types start selected. Clicking an active type deselects it
 * (the last remaining type cannot be turned off). Isolate one type
 * by deselecting the other, then assert the keep button is the only active one.
 */
async function activateOnlyType(page: Page, type: 'zeitspanne' | 'verspaetung'): Promise<void> {
  const keepName = type === 'zeitspanne' ? /Zeitspannen/ : /Verspätung/;
  const otherName = type === 'zeitspanne' ? /Verspätung/ : /Zeitspannen/;
  const keepBtn = page.locator('.type-selector').getByRole('button', { name: keepName });
  const otherBtn = page.locator('.type-selector').getByRole('button', { name: otherName });

  if (await otherBtn.evaluate((el) => el.classList.contains('active'))) {
    await otherBtn.click();
  }
  if (!(await keepBtn.evaluate((el) => el.classList.contains('active')))) {
    await keepBtn.click();
  }

  await expect(keepBtn).toHaveClass(/active/);
  await expect(otherBtn).not.toHaveClass(/active/);
}

test.describe('Uhrzeit Zeitpunkte und Zeitspannen', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
  });

  test('should show type selector with Zeitspannen and Verspätung', async ({ page }) => {
    await page.goto('/uhrzeit/zeitpunkte-zeitspannen');

    await expect(page.locator('.type-selector')).toBeVisible();
    await expect(page.locator('.type-selector .type-btn')).toHaveCount(2);
    await expect(page.locator('.type-selector').getByRole('button', { name: /Zeitspannen/ })).toHaveClass(
      /active/
    );
    await expect(page.locator('.type-selector').getByRole('button', { name: /Verspätung/ })).toHaveClass(
      /active/
    );
  });

  test('should show Zeitspannen UI when only Zeitspannen is active', async ({ page }) => {
    await page.goto('/uhrzeit/zeitpunkte-zeitspannen');
    await activateOnlyType(page, 'zeitspanne');

    await expect(page.getByRole('heading', { name: 'Wie viele Minuten sind vergangen?' })).toBeVisible();
    await expect(page.locator('.span-row')).toBeVisible();
    await expect(page.locator('.duration-field')).toHaveCount(2);
    await expect(page.locator('.keypad')).toBeVisible();
    await expect(page.locator('.bus-card')).toHaveCount(0);
  });

  test('should show Verspätung UI when only Verspätung is active', async ({ page }) => {
    await page.goto('/uhrzeit/zeitpunkte-zeitspannen');
    await activateOnlyType(page, 'verspaetung');

    await expect(page.getByRole('heading', { name: 'Oh nein, Verspätung!' })).toBeVisible();
    await expect(page.locator('.bus-card')).toBeVisible();
    await expect(page.locator('.time-input')).toBeVisible();
    await expect(page.locator('.time-input')).toHaveAttribute('placeholder', 'HH.MM');
    await expect(page.locator('.span-row')).toHaveCount(0);
  });

  test('should submit a Zeitspannen answer and show feedback', async ({ page }) => {
    await page.goto('/uhrzeit/zeitpunkte-zeitspannen');
    await activateOnlyType(page, 'zeitspanne');

    await page.getByRole('button', { name: 'Minuten eingeben' }).click();
    await page.locator('.keypad button', { hasText: '4' }).click();
    await page.locator('.keypad button', { hasText: '5' }).click();
    await page.locator('.btn-ok').click();

    await expect(page.locator('.feedback-area .feedback')).toBeVisible({ timeout: 3000 });
  });

  test('should submit a Verspätung time and show feedback', async ({ page }) => {
    await page.goto('/uhrzeit/zeitpunkte-zeitspannen');
    await activateOnlyType(page, 'verspaetung');
    await expect(page.locator('.time-input')).toBeVisible();

    await page.locator('.keypad button', { hasText: '1' }).click();
    await page.locator('.keypad button', { hasText: '4' }).click();
    await page.locator('.keypad button', { hasText: '3' }).click();
    await page.locator('.keypad button', { hasText: '0' }).click();
    await page.locator('.btn-ok').click();

    await expect(page.locator('.feedback-area .feedback')).toBeVisible({ timeout: 3000 });
  });

  test('landscape: task and stats on the left, keypad on the right', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/uhrzeit/zeitpunkte-zeitspannen');
    await activateOnlyType(page, 'zeitspanne');

    const taskBox = await page.locator('.task-section').boundingBox();
    const answerBox = await page.locator('.answer-section').boundingBox();
    const streakBox = await page.locator('.streak-display').boundingBox();
    const statsBox = await page.locator('.result-summary').boundingBox();
    const keypadBox = await page.locator('.keypad').boundingBox();

    expect(taskBox).toBeTruthy();
    expect(answerBox).toBeTruthy();
    expect(streakBox).toBeTruthy();
    expect(statsBox).toBeTruthy();
    expect(keypadBox).toBeTruthy();

    expect(taskBox!.x).toBeLessThan(answerBox!.x);
    expect(streakBox!.x).toBeLessThan(answerBox!.x);
    expect(statsBox!.x).toBeLessThan(answerBox!.x);
    expect(keypadBox!.x).toBeGreaterThan(taskBox!.x);

    await activateOnlyType(page, 'verspaetung');
    const busBox = await page.locator('.bus-card').boundingBox();
    const timeInputBox = await page.locator('.time-input').boundingBox();
    expect(busBox).toBeTruthy();
    expect(timeInputBox).toBeTruthy();
    expect(busBox!.x).toBeLessThan(timeInputBox!.x);
  });
});
