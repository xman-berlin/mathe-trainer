import { test, expect, type Page } from '@playwright/test';
import { bypassLogin } from './helpers';

async function enterAnswerViaKeypad(page: Page, answer: number): Promise<void> {
  for (const digit of String(answer)) {
    await page.locator('.keypad button', { hasText: digit, exact: true }).click();
  }
  await page.locator('.btn-ok').click();
}

const BOBBI_PROBLEM = {
  kind: 'two-step',
  type: 'two-step',
  theme: 'money-family',
  storyText:
    'Bobbi fährt mit seinen Eltern mit dem Bus. Eine Erwachsenenkarte kostet 17€. Kinder bezahlen 6€ weniger. Wie viel muss die Familie bezahlen?',
  icon: '🚌',
  templateId: 'money-family-tickets',
  givenNumbers: [17, 6],
  intermediateValues: [11],
  expectedAddends: [17, 17, 11],
  correctAnswer: 45,
  unit: 'euro',
  sampleRechnung: '17€ + 17€ + 11€ = 45 €',
  sampleAntwort: 'Die Familie bezahlt 45€.',
  answerKeywords: ['familie', 'eltern', 'bezal', 'zahl', 'zusammen', 'kost'],
  numberRange: 'bis100',
  playerLevel: 4,
};

test.describe('Mathe Sachaufgaben', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
  });

  test('should show word problem exercise with status card and no type selector', async ({
    page,
  }) => {
    await page.goto('/mathe/sachaufgaben');

    await expect(page.getByRole('heading', { name: 'Sachaufgaben lösen' })).toBeVisible();
    await expect(page.locator('.type-selector')).toHaveCount(0);
    await expect(page.locator('.task-card')).toBeVisible();
    await expect(page.locator('app-exercise-status-card')).toBeVisible();
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

  test('should resume a seeded two-step Bobbi problem and grade the final number', async ({
    page,
  }) => {
    await page.goto('/mathe');
    await page.evaluate((problem) => {
      localStorage.setItem('schlaufuchs-pending-word-problem', JSON.stringify(problem));
    }, BOBBI_PROBLEM);

    await page.goto('/mathe/sachaufgaben');

    await expect(page.locator('.story-text')).toContainText('Bobbi');
    await enterAnswerViaKeypad(page, 45);

    await expect(page.locator('.feedback-correct')).toBeVisible({ timeout: 2000 });
  });

  test('should practice a seeded one-step story with the numeric keypad', async ({ page }) => {
    const oneStep = {
      kind: 'one-step',
      type: 'addition',
      storyText: 'Lisa hat 3 Äpfel. Sie bekommt 2 Äpfel geschenkt. Wie viele hat sie jetzt?',
      operandA: 3,
      operandB: 2,
      correctAnswer: 5,
      templateId: 'apples',
      numberRange: 'bis20',
      playerLevel: 1,
    };

    await page.goto('/mathe');
    await page.evaluate((problem) => {
      localStorage.setItem('schlaufuchs-pending-word-problem', JSON.stringify(problem));
    }, oneStep);

    await page.goto('/mathe/sachaufgaben');

    await expect(page.locator('.answer-input')).toBeVisible();
    await expect(page.locator('.keypad')).toBeVisible();

    await enterAnswerViaKeypad(page, 5);

    await expect(page.locator('.feedback-correct')).toBeVisible({ timeout: 2000 });
  });
});
