import { test, expect, type Page } from '@playwright/test';
import { bypassLogin } from './helpers';

/**
 * All five types start selected. Isolate one type by turning the others off
 * (the last remaining type cannot be turned off).
 */
async function activateOnlyType(page: Page, ariaLabel: string): Promise<void> {
  const keepBtn = page.locator('.type-selector').getByRole('button', { name: ariaLabel });
  if (!(await keepBtn.evaluate((el) => el.classList.contains('active')))) {
    await keepBtn.click();
  }

  const buttons = page.locator('.type-selector .type-btn');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const btn = buttons.nth(i);
    const label = await btn.getAttribute('aria-label');
    if (label === ariaLabel) {
      continue;
    }
    const active = await btn.evaluate((el) => el.classList.contains('active'));
    if (active) {
      await btn.click();
    }
  }

  await expect(keepBtn).toHaveClass(/active/);
}

async function enterAnswerViaKeypad(page: Page, answer: number): Promise<void> {
  for (const digit of String(answer)) {
    await page.locator('.keypad button', { hasText: digit, exact: true }).click();
  }
  await page.locator('.btn-ok').click();
}

test.describe('Mathe Sachaufgaben', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
  });

  test('should show word problem exercise page with mixed types selected', async ({ page }) => {
    await page.goto('/mathe/sachaufgaben');

    await expect(page.getByRole('heading', { name: 'Sachaufgaben lösen' })).toBeVisible();
    await expect(page.locator('.type-selector')).toBeVisible();
    await expect(page.locator('.type-btn')).toHaveCount(5);
    await expect(page.locator('.type-selector').getByRole('button', { name: 'Zweistufig' })).toHaveClass(
      /active/
    );
    await expect(page.locator('.type-selector').getByRole('button', { name: 'Plus' })).toHaveClass(
      /active/
    );
    await expect(page.locator('.type-selector').getByRole('button', { name: 'Geteilt' })).toHaveClass(
      /active/
    );
    await expect(page.locator('.story-display')).toBeVisible();
    await expect(page.locator('.keypad')).toBeVisible();
  });

  test('should not show range selector buttons (Zahlenraum is set on Mathe overview)', async ({
    page,
  }) => {
    await page.goto('/mathe/sachaufgaben');

    await expect(page.locator('.range-selector')).not.toBeVisible();
  });

  test('should display a word problem', async ({ page }) => {
    await page.goto('/mathe/sachaufgaben');

    await expect(page.locator('.story-text')).toBeVisible();
    await expect(page.locator('.story-icon')).toBeVisible();
  });

  test('should start with the Bobbi bus-ticket story when only two-step is active', async ({
    page,
  }) => {
    await page.goto('/mathe/sachaufgaben');
    await activateOnlyType(page, 'Zweistufig');

    await expect(page.locator('.story-text')).toContainText(
      'Bobbi fährt mit seinen Eltern mit dem Bus. Eine Erwachsenenkarte kostet 17€. Kinder bezahlen 6€ weniger. Wie viel muss die Familie bezahlen?'
    );
    await expect(page.locator('.answer-input')).toBeVisible();
    await expect(page.locator('.keypad')).toBeVisible();
  });

  test('should answer a two-step word problem with the final number only', async ({ page }) => {
    await page.goto('/mathe/sachaufgaben');
    await activateOnlyType(page, 'Zweistufig');

    await expect(page.locator('.story-text')).toContainText('Bobbi');
    await enterAnswerViaKeypad(page, 45);

    await expect(page.locator('.feedback-correct')).toBeVisible({ timeout: 2000 });
  });

  test('should still practice classic one-step stories with the numeric keypad', async ({
    page,
  }) => {
    await page.goto('/mathe/sachaufgaben');
    await activateOnlyType(page, 'Plus');

    await expect(page.locator('.answer-input')).toBeVisible();
    await expect(page.locator('.keypad')).toBeVisible();

    await page.locator('.keypad button', { hasText: '5' }).click();
    await page.locator('.btn-ok').click();

    await expect(page.locator('.feedback-correct, .feedback-incorrect')).toBeVisible({
      timeout: 2000,
    });
  });
});
