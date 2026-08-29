import { test, expect, type Page } from '@playwright/test';
import { bypassLogin, handleMigrationDialog } from './helpers';

/**
 * Navigation smoke tests — verify every user-facing route
 * is reachable by clicking through the UI (not via page.goto).
 *
 * When adding new routes, extend the corresponding test case below.
 */
test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
    await page.goto('/');
    await handleMigrationDialog(page);
  });

  test.describe('Mathe', () => {
    test('should navigate from home to mathe overview', async ({ page }) => {
      await page.getByRole('link', { name: 'Mathe' }).click();
      await expect(page).toHaveURL(/\/mathe$/);
      await expect(page.getByRole('heading', { name: 'Mathe' })).toBeVisible();
    });

    test('should navigate from mathe overview to uebung', async ({ page }) => {
      await page.getByRole('link', { name: 'Mathe' }).click();
      await expect(page).toHaveURL(/\/mathe$/);

      await page.getByRole('link', { name: 'Übung' }).click();
      await expect(page).toHaveURL(/\/mathe\/uebung$/);
      await expect(page.locator('.type-toggle').first()).toBeVisible();
    });

    test.skip('should navigate from mathe overview to zeitrennen', async ({ page }) => {
      await page.getByRole('link', { name: 'Mathe' }).click();
      await expect(page).toHaveURL(/\/mathe$/);

      await page.getByRole('link', { name: 'Zeitrennen' }).click();
      await expect(page).toHaveURL(/\/mathe\/zeitrennen$/);
      await expect(page.getByRole('button', { name: 'Starten' })).toBeVisible();
    });

    test('should navigate from mathe overview to sachaufgaben', async ({ page }) => {
      await page.getByRole('link', { name: 'Mathe' }).click();
      await expect(page).toHaveURL(/\/mathe$/);

      await page.getByRole('link', { name: 'Sachaufgaben' }).click();
      await expect(page).toHaveURL(/\/mathe\/sachaufgaben$/);
      await expect(page.locator('.story-text')).toBeVisible();
    });
  });

  test.describe('Uhrzeit', () => {
    test('should navigate from home to uhrzeit overview', async ({ page }) => {
      await page.getByRole('link', { name: 'Uhrzeit lernen' }).click();
      await expect(page).toHaveURL(/\/uhrzeit$/);
      await expect(page.getByRole('heading', { name: 'Uhrzeit' })).toBeVisible();
    });

    test('should navigate from uhrzeit overview to uebung', async ({ page }) => {
      await page.getByRole('link', { name: 'Uhrzeit lernen' }).click();
      await expect(page).toHaveURL(/\/uhrzeit$/);

      await page.getByRole('link', { name: 'Übung' }).click();
      await expect(page).toHaveURL(/\/uhrzeit\/uebung$/);
      await expect(page.locator('.clock-exercise-root')).toBeVisible();
    });

    test.skip('should navigate from uhrzeit overview to zeitrennen', async ({ page }) => {
      await page.getByRole('link', { name: 'Uhrzeit lernen' }).click();
      await expect(page).toHaveURL(/\/uhrzeit$/);

      await page.getByRole('link', { name: 'Zeitrennen' }).click();
      await expect(page).toHaveURL(/\/uhrzeit\/zeitrennen$/);
      await expect(page.getByRole('button', { name: 'Starten' })).toBeVisible();
    });

    test('should navigate from uhrzeit overview to zeiger setzen', async ({ page }) => {
      await page.getByRole('link', { name: 'Uhrzeit lernen' }).click();
      await expect(page).toHaveURL(/\/uhrzeit$/);

      await page.getByRole('link', { name: 'Zeiger setzen' }).click();
      await expect(page).toHaveURL(/\/uhrzeit\/zeiger-setzen$/);
      await expect(page.locator('.set-clock-exercise-root')).toBeVisible();
    });
  });

  test.describe('Deutsch', () => {
    test('should navigate from home to deutsch overview', async ({ page }) => {
      await page.getByRole('link', { name: 'Deutsch' }).click();
      await expect(page).toHaveURL(/\/deutsch$/);
      await expect(page.getByRole('heading', { name: 'Deutsch' })).toBeVisible();
    });

    test('should navigate from deutsch overview to rechtschreibung', async ({ page }) => {
      await page.getByRole('link', { name: 'Deutsch' }).click();
      await expect(page).toHaveURL(/\/deutsch$/);

      await page.getByRole('link', { name: 'Rechtschreibung' }).click();
      await expect(page).toHaveURL(/\/deutsch\/rechtschreibung$/);
      await expect(page.locator('.vocab-exercise-page')).toBeVisible();
    });

    test('should navigate from deutsch overview to hangman', async ({ page }) => {
      await page.getByRole('link', { name: 'Deutsch' }).click();
      await expect(page).toHaveURL(/\/deutsch$/);

      await page.getByRole('link', { name: 'Wörter Raten' }).click();
      await expect(page).toHaveURL(/\/deutsch\/hangman$/);
      await expect(page.locator('.vocab-exercise-page')).toBeVisible();
    });

    test('should navigate from deutsch overview to verwalten', async ({ page }) => {
      await page.getByRole('link', { name: 'Deutsch' }).click();
      await expect(page).toHaveURL(/\/deutsch$/);

      await page.getByRole('link', { name: 'Wortlisten verwalten' }).click();
      await expect(page).toHaveURL(/\/deutsch\/verwalten$/);
      await expect(page.getByRole('heading', { name: 'Wortlisten' })).toBeVisible();
    });

    test('should navigate from deutsch overview to wochentage', async ({ page }) => {
      await page.getByRole('link', { name: 'Deutsch' }).click();
      await expect(page).toHaveURL(/\/deutsch$/);

      await page.getByRole('link', { name: 'Wochentage' }).click();
      await expect(page).toHaveURL(/\/deutsch\/wochentage$/);
      await expect(page.getByText('📅 Wochentage')).toBeVisible();
    });

    test('should navigate from deutsch overview to monate', async ({ page }) => {
      await page.getByRole('link', { name: 'Deutsch' }).click();
      await expect(page).toHaveURL(/\/deutsch$/);

      await page.getByRole('link', { name: 'Monate' }).click();
      await expect(page).toHaveURL(/\/deutsch\/monate$/);
      await expect(page.getByText('🗓️ Monate')).toBeVisible();
    });

    test('should navigate from deutsch overview to alphabet', async ({ page }) => {
      await page.getByRole('link', { name: 'Deutsch' }).click();
      await expect(page).toHaveURL(/\/deutsch$/);

      await page.getByRole('link', { name: 'Alphabet' }).click();
      await expect(page).toHaveURL(/\/deutsch\/alphabet$/);
      await expect(page.getByText('🔤 Alphabet')).toBeVisible();
    });
  });

  test.describe('Erfolge', () => {
    test('should navigate from home to erfolge', async ({ page }) => {
      await page.getByRole('link', { name: 'Erfolge' }).click();
      await expect(page).toHaveURL(/\/erfolge$/);
      await expect(page.getByRole('heading', { name: 'Erfolge', exact: true })).toBeVisible();
    });

    test('should switch between tabs on erfolge page', async ({ page }) => {
      await page.getByRole('link', { name: 'Erfolge' }).click();
      await expect(page).toHaveURL(/\/erfolge$/);

      // Mathe tab (default)
      const matheTab = page.getByRole('button', { name: 'Mathe' });
      await expect(matheTab).toHaveClass(/active/);

      // Switch to Uhrzeit
      await page.getByRole('button', { name: 'Uhrzeit' }).click();
      await expect(page.getByRole('button', { name: 'Uhrzeit' })).toHaveClass(/active/);

      // Switch to Badges
      await page.getByRole('button', { name: 'Badges' }).click();
      await expect(page.getByRole('button', { name: 'Badges' })).toHaveClass(/active/);

      // Switch to Spiele
      await page.getByRole('button', { name: 'Spiele' }).click();
      await expect(page.getByRole('button', { name: 'Spiele' })).toHaveClass(/active/);
    });
  });

  test.describe('Spiele', () => {
    async function openGamesTab(page: Page) {
      await page.getByRole('link', { name: 'Erfolge' }).click();
      await expect(page).toHaveURL(/\/erfolge$/);
      await page.getByRole('button', { name: 'Spiele' }).click();
      await expect(page.getByRole('button', { name: 'Spiele' })).toHaveClass(/active/);
    }

    test('should navigate to flappy-fox', async ({ page }) => {
      await openGamesTab(page);
      await page.getByRole('link', { name: /Flappy Fox/ }).click();
      await expect(page).toHaveURL(/\/spielen\/flappy-fox$/);
      await expect(page.locator('.flappy-fox-container, canvas').first()).toBeVisible();
    });

    test('should navigate to dino-run', async ({ page }) => {
      await openGamesTab(page);
      await page.getByRole('link', { name: /Dino Run/ }).click();
      await expect(page).toHaveURL(/\/spielen\/dino-run$/);
      await expect(page.locator('.dino-run-container, canvas').first()).toBeVisible();
    });

    test('should navigate to breakout', async ({ page }) => {
      await openGamesTab(page);
      await page.getByRole('link', { name: /Breakout/ }).click();
      await expect(page).toHaveURL(/\/spielen\/breakout$/);
      await expect(page.locator('.breakout-container, canvas').first()).toBeVisible();
    });

    test('should navigate to balloon-pop', async ({ page }) => {
      await openGamesTab(page);
      await page.getByRole('link', { name: /Balloon Pop/ }).click();
      await expect(page).toHaveURL(/\/spielen\/balloon-pop$/);
      await expect(page.locator('.balloon-pop-container, canvas').first()).toBeVisible();
    });
  });
});
