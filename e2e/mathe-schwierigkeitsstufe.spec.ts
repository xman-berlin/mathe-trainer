import { test, expect, Page } from '@playwright/test';
import { bypassLogin } from './helpers';

/** Get the ExerciseComponent instance via Angular's ng utilities */
async function getComp(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector('app-exercise');
    return (window as unknown as Record<string, (el: Element) => unknown>)['ng']?.['getComponent']?.(
      el!
    );
  });
}

/** Set lastLevelUp on DifficultyService, then wait for Angular's effect scheduler */
async function triggerLevelUp(page: Page, level = 4) {
  await page.evaluate((lvl) => {
    const el = document.querySelector('app-exercise')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = (window as any).ng?.getComponent?.(el);
    comp.difficultyService.lastLevelUp.set({ type: 'addition', level: lvl });
  }, level);
  // Allow Angular zoneless scheduler to flush effects
  await page.waitForTimeout(200);
}

/** Set lastLevelDown on DifficultyService, then wait for Angular's effect scheduler */
async function triggerLevelDown(page: Page, level = 2) {
  await page.evaluate((lvl) => {
    const el = document.querySelector('app-exercise')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = (window as any).ng?.getComponent?.(el);
    comp.difficultyService.lastLevelDown.set({ type: 'addition', level: lvl });
  }, level);
  await page.waitForTimeout(200);
}

/** Read showLevelUp signal value from the component */
async function getShowLevelUp(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.querySelector('app-exercise')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = (window as any).ng?.getComponent?.(el);
    return comp?.showLevelUp?.() ?? false;
  });
}

/** Read lastLevelUp signal value from DifficultyService */
async function getLastLevelUp(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector('app-exercise')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = (window as any).ng?.getComponent?.(el);
    return comp?.difficultyService?.lastLevelUp?.() ?? null;
  });
}

/** Read lastLevelDown signal value from DifficultyService */
async function getLastLevelDown(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector('app-exercise')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = (window as any).ng?.getComponent?.(el);
    return comp?.difficultyService?.lastLevelDown?.() ?? null;
  });
}

/** Record one result directly via DifficultyService, wait for scheduler */
async function recordResult(page: Page, type: string, correct: boolean) {
  await page.evaluate(
    ([t, c]) => {
      const el = document.querySelector('app-exercise')!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const comp = (window as any).ng?.getComponent?.(el);
      comp.difficultyService.recordResult(t, c);
    },
    [type, correct] as [string, boolean]
  );
  await page.waitForTimeout(100);
}

test.describe('Schwierigkeitsstufe Benachrichtigungen', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
    await page.goto('/mathe/uebung');
    await page.waitForSelector('.problem-display');
    // Wait for async Supabase init calls to settle (they fail for test user but must complete)
    await page.waitForTimeout(1500);
  });

  // ─── Level-Up ────────────────────────────────────────────────────────────

  test('Level-Up Popup erscheint wenn lastLevelUp gesetzt wird', async ({ page }) => {
    await triggerLevelUp(page, 4);

    await expect(page.locator('.level-change-popup.level-up')).toBeVisible();
    await expect(page.locator('.level-change-popup.level-up')).toContainText('Neue Stufe');
  });

  test('Level-Up Popup zeigt Tier-Emoji und Namen korrekt an', async ({ page }) => {
    await triggerLevelUp(page, 3); // level 3 = Wolf 🐺

    await expect(page.locator('.level-change-popup.level-up')).toContainText('🐺');
    await expect(page.locator('.level-change-popup.level-up')).toContainText('Wolf');
  });

  test('Level-Up Popup verschwindet automatisch nach 2.5s', async ({ page }) => {
    await triggerLevelUp(page, 4);

    await expect(page.locator('.level-change-popup.level-up')).toBeVisible();
    await expect(page.locator('.level-change-popup')).not.toBeVisible({ timeout: 5000 });
  });

  test('lastLevelUp wird nach Anzeige auf null zurückgesetzt (Regression)', async ({ page }) => {
    await triggerLevelUp(page, 4);

    await expect(page.locator('.level-change-popup.level-up')).toBeVisible();

    // Signal must be consumed immediately — not just when popup disappears
    expect(await getLastLevelUp(page)).toBeNull();
  });

  test('Level-Up Popup erscheint NICHT erneut nach weiteren Antworten (Regression)', async ({
    page,
  }) => {
    // Trigger and wait for popup
    await triggerLevelUp(page, 4);
    await expect(page.locator('.level-change-popup.level-up')).toBeVisible();
    expect(await getLastLevelUp(page)).toBeNull(); // consumed

    // Wait for auto-dismiss
    await expect(page.locator('.level-change-popup')).not.toBeVisible({ timeout: 5000 });

    // Record more results — this changes _levels signal and re-runs the effect
    await recordResult(page, 'addition', true);
    await recordResult(page, 'addition', true);
    await recordResult(page, 'addition', false);

    // Popup must NOT re-appear — lastLevelUp is still null
    await expect(page.locator('.level-change-popup')).not.toBeVisible({ timeout: 1000 });
    expect(await getLastLevelUp(page)).toBeNull();
  });

  test('Zweites unabhängiges Level-Up Event zeigt Popup erneut', async ({ page }) => {
    // First event
    await triggerLevelUp(page, 4);
    await expect(page.locator('.level-change-popup.level-up')).toBeVisible();
    await expect(page.locator('.level-change-popup')).not.toBeVisible({ timeout: 5000 });

    // Second independent event
    await triggerLevelUp(page, 5);
    await expect(page.locator('.level-change-popup.level-up')).toBeVisible();
  });

  // ─── Level-Down ──────────────────────────────────────────────────────────

  test('Level-Down Popup erscheint wenn lastLevelDown gesetzt wird', async ({ page }) => {
    await triggerLevelDown(page, 2);

    await expect(page.locator('.level-change-popup.level-down')).toBeVisible();
    await expect(page.locator('.level-change-popup.level-down')).toContainText('Stufe gesenkt');
  });

  test('Level-Down Popup zeigt Tier-Emoji und Namen korrekt an', async ({ page }) => {
    await triggerLevelDown(page, 2); // level 2 = Fuchs 🦊

    await expect(page.locator('.level-change-popup.level-down')).toContainText('🦊');
    await expect(page.locator('.level-change-popup.level-down')).toContainText('Fuchs');
  });

  test('lastLevelDown wird nach Anzeige auf null zurückgesetzt (Regression)', async ({ page }) => {
    await triggerLevelDown(page, 2);

    await expect(page.locator('.level-change-popup.level-down')).toBeVisible();
    expect(await getLastLevelDown(page)).toBeNull();
  });

  test('Level-Down Popup erscheint NICHT erneut nach weiteren Antworten (Regression)', async ({
    page,
  }) => {
    await triggerLevelDown(page, 2);
    await expect(page.locator('.level-change-popup.level-down')).toBeVisible();
    expect(await getLastLevelDown(page)).toBeNull();

    await expect(page.locator('.level-change-popup')).not.toBeVisible({ timeout: 5000 });

    // More results — recentResults was reset after level-down, not enough to re-trigger
    await recordResult(page, 'addition', false);
    await recordResult(page, 'addition', false);

    await expect(page.locator('.level-change-popup')).not.toBeVisible({ timeout: 1000 });
    expect(await getLastLevelDown(page)).toBeNull();
  });

  // ─── Via real recordResult (integration) ─────────────────────────────────

  test('Level-Up tritt nach 5 richtigen Antworten in Folge auf', async ({ page }) => {
    // Record 5 correct answers for addition → triggers level-up (streak reaches STREAK_UP=5)
    for (let i = 0; i < 5; i++) {
      await recordResult(page, 'addition', true);
    }
    await page.waitForTimeout(300);

    expect(await getShowLevelUp(page)).toBe(true);
    await expect(page.locator('.level-change-popup.level-up')).toBeVisible();
  });

  test('Level-Down tritt nach 3 falschen von 5 Antworten auf', async ({ page }) => {
    // Fill the 5-answer window with ≥3 wrong answers
    // Use a clear pattern: wrong, wrong, wrong, correct, correct = 3/5 wrong
    for (let i = 0; i < 5; i++) {
      await recordResult(page, 'addition', i < 3 ? false : true);
    }
    await page.waitForTimeout(300);

    expect(await getShowLevelUp(page)).toBe(true);
    await expect(page.locator('.level-change-popup.level-down')).toBeVisible();
  });
});
