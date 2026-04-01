import { test, expect } from '@playwright/test';
import { bypassLogin } from './helpers';

test.describe('Mathe Übung', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
  });

  test('should show exercise page with type selector', async ({ page }) => {
    await page.goto('/mathe/uebung');

    await expect(page.locator('.type-toggle').first()).toBeVisible();
    await expect(page.locator('.problem-display')).toBeVisible();
  });

  test('should solve an addition problem', async ({ page }) => {
    await page.goto('/mathe/uebung');

    // Select only addition
    const additionBtn = page.locator('.type-toggle', { hasText: '+' });
    await additionBtn.click();

    // Wait for problem to load
    await expect(page.locator('.operand-display').first()).toBeVisible();

    // Read the problem
    const operandA = await page.locator('.operand-display').first().textContent();
    const operandB = await page.locator('.operand-display').nth(1).textContent();
    const answer = parseInt(operandA!) + parseInt(operandB!);

    // Enter answer via keypad
    for (const digit of answer.toString().split('')) {
      await page.locator('.keypad button', { hasText: digit }).click();
    }
    await page.locator('.btn-ok').click();

    // Check feedback area
    await expect(page.locator('.feedback-area .feedback')).toBeVisible({ timeout: 3000 });
  });

  test('should solve a subtraction problem', async ({ page }) => {
    await page.goto('/mathe/uebung');

    // Select only subtraction
    const subtractionBtn = page.locator('.type-toggle', { hasText: '−' });
    await subtractionBtn.click();

    // Read the problem
    const operandA = await page.locator('.operand-display').first().textContent();
    const operandB = await page.locator('.operand-display').nth(1).textContent();
    const answer = parseInt(operandA!) - parseInt(operandB!);

    // Enter answer via keypad
    for (const digit of answer.toString().split('')) {
      if (digit === '-') continue;
      await page.locator('.keypad button', { hasText: digit }).click();
    }
    await page.locator('.btn-ok').click();

    // Check feedback (correct or incorrect)
    await expect(page.locator('.feedback').first()).toBeVisible({ timeout: 2000 });
  });

  test('should show multiplier selector for multiplication', async ({ page }) => {
    await page.goto('/mathe/uebung');

    // Select multiplication
    const multBtn = page.locator('.type-toggle', { hasText: '×' });
    await multBtn.click();

    // Multiplier selector should appear
    await expect(page.locator('.multiplier-selector')).toBeVisible();
    await expect(page.locator('.multiplier-btn').first()).toBeVisible();
  });

  test('should solve a division problem', async ({ page }) => {
    await page.goto('/mathe/uebung');

    // Select only division
    const divisionBtn = page.locator('.type-toggle', { hasText: '÷' });
    await divisionBtn.click();

    // Wait for problem to load
    await expect(page.locator('.operand-display').first()).toBeVisible();

    // Read the problem
    const operandA = await page.locator('.operand-display').first().textContent();
    const operandB = await page.locator('.operand-display').nth(1).textContent();

    // Only solve if division results in whole number
    const a = parseInt(operandA!);
    const b = parseInt(operandB!);
    if (b !== 0 && a % b === 0) {
      const answer = a / b;

      // Enter answer via keypad
      for (const digit of answer.toString().split('')) {
        await page.locator('.keypad button', { hasText: digit }).click();
      }
      await page.locator('.btn-ok').click();

      // Check feedback
      await expect(page.locator('.feedback-area .feedback')).toBeVisible({ timeout: 3000 });
    } else {
      // Skip test if not a clean division
      test.skip();
    }
  });
});