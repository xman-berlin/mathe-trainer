import { test, expect } from '@playwright/test';
import { bypassLogin } from './helpers';

const ROUTE = '/uhrzeit/zeiger-setzen';

/**
 * Inject lifetime stats so that `lockedTypes` in the component reflects them.
 *
 * The StatsService loads from localStorage first, then calls Supabase in the background.
 * For the fake E2E user the Supabase call returns empty stats (user not in DB), which
 * would overwrite the localStorage data. We therefore also intercept the Supabase REST
 * call for `lifetime_stats` and return the desired stats directly.
 */
async function setLifetimeStats(
  page: Parameters<typeof bypassLogin>[0],
  stats: Record<string, number>,
): Promise<void> {
  // 1. Pre-populate localStorage so the service's synchronous load picks it up.
  await page.addInitScript((s) => {
    localStorage.setItem('schlaufuchs-lifetime-stats', JSON.stringify({ byType: s }));
  }, stats);

  // 2. Intercept the async Supabase REST call so it returns the same data,
  //    preventing the server response from overwriting the local stats.
  await page.route('**/rest/v1/lifetime_stats*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ stats_by_type: stats, best_streaks_by_type: {} }),
    }),
  );
}

/** Stats where all seven types are mastered (≥ 100 correct) — permanently active, can't be deselected. */
const ALL_UNLOCKED = {
  'clock-setClock-full': 100,
  'clock-setClock-half': 100,
  'clock-setClock-quarter': 100,
  'clock-setClock-fiveMin': 100,
  'clock-setClock-fiveMinAfter': 100,
  'clock-setClock-fiveMinBefore': 100,
  'clock-setClock-fiveMinHalf': 100,
};

/** Stats with no answers yet — types are freely deselectable, no lock icons shown. */
const ALL_LOCKED = {};

test.describe('Uhrzeit Zeiger setzen', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
  });

  // ─── Basic page structure ─────────────────────────────────────────────────

  test('should show set clock exercise page', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(page.locator('.type-selector')).toBeVisible();
    await expect(page.locator('.interactive-clock-container')).toBeVisible();
  });

  test('should display interactive clock with draggable hands', async ({ page }) => {
    // Restrict to basic types so the hour hand is never auto-locked
    await page.addInitScript(() => {
      localStorage.setItem(
        'schlaufuchs-setClock-selectedTypes',
        JSON.stringify(['full', 'half', 'quarter', 'fiveMin']),
      );
    });
    await page.goto(ROUTE);
    await expect(page.locator('.clock-svg')).toBeVisible();
    await expect(page.locator('.hour-hand-handle')).toBeVisible();
    await expect(page.locator('.minute-hand-handle')).toBeVisible();
  });

  test('should show target time input', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(page.locator('.target-time-input')).toBeVisible();
  });

  test('should show submit button labelled Überprüfen', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(page.locator('.submit-btn')).toBeVisible();
    await expect(page.locator('.submit-btn')).toContainText('Überprüfen');
  });

  // ─── Type selector ────────────────────────────────────────────────────────

  test('should show all seven type buttons', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(page.locator('.type-btn')).toHaveCount(7);
  });

  test('should show all seven type buttons as active by default', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(page.locator('.type-btn.active')).toHaveCount(7);
  });

  test('should show lock icons on all type buttons when stats are empty', async ({ page }) => {
    await setLifetimeStats(page, ALL_UNLOCKED);
    await page.goto(ROUTE);
    // Every type button should carry the lock-icon span (mastered = permanently locked)
    await expect(page.locator('.type-btn .lock-icon')).toHaveCount(7);
  });

  test('should not show lock icons when all types are unlocked', async ({ page }) => {
    await setLifetimeStats(page, ALL_LOCKED);
    await page.goto(ROUTE);
    await expect(page.locator('.type-btn .lock-icon')).toHaveCount(0);
  });

  test('should not deselect a locked type when clicked', async ({ page }) => {
    await setLifetimeStats(page, ALL_UNLOCKED);
    await page.goto(ROUTE);

    // Click the first type button (it's locked / mastered)
    const firstBtn = page.locator('.type-btn').first();
    await expect(firstBtn).toHaveClass(/active/);
    await firstBtn.click();
    // Must remain active because it's locked
    await expect(firstBtn).toHaveClass(/active/);
  });

  test('should allow deselecting a type once it is unlocked', async ({ page }) => {
    // Types not yet mastered (<100) are freely deselectable
    await setLifetimeStats(page, ALL_LOCKED);
    await page.goto(ROUTE);

    // All 7 active; click the first one to deselect it
    const firstBtn = page.locator('.type-btn').first();
    await expect(firstBtn).toHaveClass(/active/);
    await firstBtn.click();
    await expect(firstBtn).not.toHaveClass(/active/);
  });

  test('should not deselect the last remaining active type even when unlocked', async ({ page }) => {
    await setLifetimeStats(page, ALL_LOCKED);
    await page.goto(ROUTE);

    const btns = page.locator('.type-btn');
    // Deselect six types, leaving only the first
    await btns.nth(1).click();
    await btns.nth(2).click();
    await btns.nth(3).click();
    await btns.nth(4).click();
    await btns.nth(5).click();
    await btns.nth(6).click();
    await expect(page.locator('.type-btn.active')).toHaveCount(1);

    // Try to deselect the last one — it must stay active
    await btns.first().click();
    await expect(page.locator('.type-btn.active')).toHaveCount(1);
  });

  // ─── Display mode toggle (locked state) ──────────────────────────────────

  test('should show display mode buttons when types are locked', async ({ page }) => {
    await setLifetimeStats(page, ALL_LOCKED);
    await page.goto(ROUTE);
    await expect(page.locator('.display-mode-selector')).toBeVisible();
    await expect(page.locator('.mode-btn')).toHaveCount(2);
  });

  test('should hide display mode buttons when all types are unlocked', async ({ page }) => {
    await setLifetimeStats(page, ALL_UNLOCKED);
    await page.goto(ROUTE);
    await expect(page.locator('.display-mode-selector')).toHaveCount(0);
    await expect(page.locator('.mode-btn')).toHaveCount(0);
  });

  // ─── Display mode: digital ────────────────────────────────────────────────

  test('should display a digital HH:MM time when mode is digital', async ({ page }) => {
    await setLifetimeStats(page, ALL_LOCKED);
    await page.goto(ROUTE);

    // Make sure digital mode is active
    const digitalBtn = page.locator('.mode-btn').first();
    if (!(await digitalBtn.evaluate((el) => el.classList.contains('active')))) {
      await digitalBtn.click();
    }

    const targetValue = await page.locator('.target-time-input').inputValue();
    expect(targetValue).toMatch(/^\d{2}:\d{2}$/);
  });

  test('target-time-input should not have .german class in digital mode', async ({ page }) => {
    await setLifetimeStats(page, ALL_LOCKED);
    await page.goto(ROUTE);

    // Ensure digital mode
    const digitalBtn = page.locator('.mode-btn').first();
    if (!(await digitalBtn.evaluate((el) => el.classList.contains('active')))) {
      await digitalBtn.click();
    }

    await expect(page.locator('.target-time-input')).not.toHaveClass(/german/);
  });

  // ─── Display mode: german ─────────────────────────────────────────────────

  test('should display a German expression when mode is switched to german', async ({ page }) => {
    await setLifetimeStats(page, ALL_LOCKED);
    await page.goto(ROUTE);

    // Switch to german mode by clicking the second mode button
    const germanBtn = page.locator('.mode-btn').nth(1);
    await germanBtn.click();

    // Use toHaveValue to wait for the Angular signal update to propagate
    // German expressions contain letters, not just digits and ':'
    await expect(page.locator('.target-time-input')).toHaveValue(/[a-zäöü]/i);
  });

  test('target-time-input should have .german class in german mode', async ({ page }) => {
    await setLifetimeStats(page, ALL_LOCKED);
    await page.goto(ROUTE);

    await page.locator('.mode-btn').nth(1).click();
    await expect(page.locator('.target-time-input')).toHaveClass(/german/);
  });

  test('toggling back to digital mode should remove .german class', async ({ page }) => {
    await setLifetimeStats(page, ALL_LOCKED);
    await page.goto(ROUTE);

    // Switch to german then back to digital
    await page.locator('.mode-btn').nth(1).click();
    await expect(page.locator('.target-time-input')).toHaveClass(/german/);
    await page.locator('.mode-btn').first().click();
    await expect(page.locator('.target-time-input')).not.toHaveClass(/german/);
  });

  // ─── autoFormatMode: both formats appear ──────────────────────────────────

  test('should produce both digital and German formats across problems in autoFormatMode', async ({
    page,
  }) => {
    await setLifetimeStats(page, ALL_UNLOCKED);
    await page.goto(ROUTE);

    // No mode buttons visible
    await expect(page.locator('.mode-btn')).toHaveCount(0);

    const seenDigital = { value: false };
    const seenGerman = { value: false };

    // Cycle through up to 40 problems to observe both formats
    for (let i = 0; i < 40; i++) {
      const targetValue = await page.locator('.target-time-input').inputValue();
      if (/^\d{2}:\d{2}$/.test(targetValue)) {
        seenDigital.value = true;
      } else {
        seenGerman.value = true;
      }
      if (seenDigital.value && seenGerman.value) break;

      // Submit the current answer (correct or not) to advance to next problem
      await page.locator('.submit-btn').click();
      // Wait for the next problem to appear (feedback clears)
      await page.waitForTimeout(2600);
    }

    expect(seenDigital.value).toBe(true);
    expect(seenGerman.value).toBe(true);
  });

  // ─── Submission ───────────────────────────────────────────────────────────

  test('should show feedback after clicking Überprüfen', async ({ page }) => {
    await page.goto(ROUTE);
    await page.locator('.submit-btn').click();
    await expect(page.locator('.feedback-area')).toBeVisible();
  });

  test('should disable submit button while feedback is showing', async ({ page }) => {
    await page.goto(ROUTE);
    await page.locator('.submit-btn').click();
    await expect(page.locator('.submit-btn')).toBeDisabled();
  });

  // ─── Persistent type selection ────────────────────────────────────────────

  test('should persist type selection across page reloads', async ({ page }) => {
    await setLifetimeStats(page, ALL_LOCKED);
    await page.goto(ROUTE);

    // Deselect all but 'fiveMinAfter' (last button, index 4)
    const btns = page.locator('.type-btn');
    await btns.nth(0).click(); // full
    await btns.nth(1).click(); // half
    await btns.nth(2).click(); // quarter
    await btns.nth(3).click(); // fiveMin
    await btns.nth(5).click(); // fiveMinBefore
    await btns.nth(6).click(); // fiveMinHalf
    await expect(page.locator('.type-btn.active')).toHaveCount(1);

    // Reload the page
    await page.reload();
    await page.waitForSelector('.type-btn');

    // Selection should be restored
    await expect(page.locator('.type-btn.active')).toHaveCount(1);
    await expect(btns.nth(4)).toHaveClass(/active/);
  });

  test('should show all seven types when localStorage is empty', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('schlaufuchs-setClock-selectedTypes');
    });
    await page.goto(ROUTE);
    await expect(page.locator('.type-btn.active')).toHaveCount(7);
  });
});
