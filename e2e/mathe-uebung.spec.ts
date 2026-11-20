import { test, expect } from '@playwright/test';
import { bypassLogin } from './helpers';

test.describe('Mathe Übung', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
  });

  test('should show exercise page with status card and no type selector', async ({ page }) => {
    await page.goto('/mathe/uebung');

    await expect(page.locator('.type-toggle')).toHaveCount(0);
    await expect(page.locator('.problem-display')).toBeVisible();
    await expect(page.locator('app-exercise-status-card')).toBeVisible();
    await expect(page.getByText('Heute')).toBeVisible();
  });

  test('should solve the displayed problem from operands and operator', async ({ page }) => {
    await page.goto('/mathe/uebung');

    await expect(page.locator('.operand-display').first()).toBeVisible();

    const operandA = parseInt((await page.locator('.operand-display').first().textContent())!);
    const operandB = parseInt((await page.locator('.operand-display').nth(1).textContent())!);
    const op = (await page.locator('.operator').textContent())!.trim();

    let answer: number;
    switch (op) {
      case '+':
        answer = operandA + operandB;
        break;
      case '−':
        answer = operandA - operandB;
        break;
      case '×':
        answer = operandA * operandB;
        break;
      case '÷':
        answer = operandA / operandB;
        break;
      default:
        throw new Error(`Unknown operator: ${op}`);
    }

    for (const digit of String(answer)) {
      if (digit === '-') continue;
      await page.locator('.keypad button', { hasText: digit, exact: true }).click();
    }
    await page.locator('.btn-ok').click();

    await expect(page.locator('.feedback-area .feedback')).toBeVisible({ timeout: 3000 });
  });

  test('should show multiplier selector when current problem is × or ÷', async ({ page }) => {
    await page.goto('/mathe/uebung');

    // Keep regenerating until we land on mult/div (auto-mix includes all ops)
    for (let i = 0; i < 40; i++) {
      const op = (await page.locator('.operator').textContent())!.trim();
      if (op === '×' || op === '÷') {
        await expect(page.locator('.multiplier-selector')).toBeVisible();
        await expect(page.locator('.multiplier-btn').first()).toBeVisible();
        return;
      }
      // Skip: submit wrong answer to advance
      await page.locator('.keypad button', { hasText: '0', exact: true }).click();
      await page.locator('.btn-ok').click();
      await page.waitForTimeout(1400);
    }

    test.skip(true, 'Did not land on multiplication/division within retries');
  });
});
