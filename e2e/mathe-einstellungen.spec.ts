import { test, expect } from '@playwright/test';
import { bypassLogin } from './helpers';

test.describe('Mathe Einstellungen (Zahlenraum)', () => {
  test.beforeEach(async ({ page }) => {
    await bypassLogin(page);
    await page.goto('/mathe');
  });

  // ─── Zahlenraum display ──────────────────────────────────────

  test('should show Zahlenraum label with default value 100', async ({ page }) => {
    await expect(page.locator('.range-label')).toBeVisible();
    await expect(page.locator('.range-label')).toContainText('Zahlenraum: bis 100');
  });

  test('should show gear button next to Zahlenraum label', async ({ page }) => {
    const gearBtn = page.locator('.range-row .goal-edit-btn-inline');
    await expect(gearBtn).toBeVisible();
  });

  // ─── Modal open / close ──────────────────────────────────────

  test('should open Zahlenraum modal when gear button is clicked', async ({ page }) => {
    await page.locator('.range-row .goal-edit-btn-inline').click();
    await expect(page.locator('.goal-editor-modal')).toBeVisible();
    await expect(page.locator('.goal-editor-modal h3')).toContainText('Zahlenraum');
  });

  test('should pre-populate input with current value when modal opens', async ({ page }) => {
    await page.locator('.range-row .goal-edit-btn-inline').click();
    const input = page.locator('.goal-editor-modal input');
    await expect(input).toHaveValue('100');
  });

  test('should close modal when Abbrechen is clicked', async ({ page }) => {
    await page.locator('.range-row .goal-edit-btn-inline').click();
    await expect(page.locator('.goal-editor-modal')).toBeVisible();
    await page.locator('.goal-editor-modal').getByRole('button', { name: 'Abbrechen' }).click();
    await expect(page.locator('.goal-editor-modal')).not.toBeVisible();
  });

  // ─── Save valid value ────────────────────────────────────────

  test('should update Zahlenraum label after saving a new value', async ({ page }) => {
    await page.locator('.range-row .goal-edit-btn-inline').click();
    const input = page.locator('.goal-editor-modal input');
    await input.fill('500');
    await page.locator('.goal-editor-modal').getByRole('button', { name: 'Speichern' }).click();

    await expect(page.locator('.goal-editor-modal')).not.toBeVisible();
    await expect(page.locator('.range-label')).toContainText('Zahlenraum: bis 500');
  });

  test('should persist Zahlenraum in localStorage after saving', async ({ page }) => {
    await page.locator('.range-row .goal-edit-btn-inline').click();
    await page.locator('.goal-editor-modal input').fill('300');
    await page.locator('.goal-editor-modal').getByRole('button', { name: 'Speichern' }).click();

    const stored = await page.evaluate(() =>
      localStorage.getItem('schlaufuchs-number-range')
    );
    expect(stored).toBe('300');
  });

  // ─── Validation ──────────────────────────────────────────────

  test('should disable Speichern button for value below 100', async ({ page }) => {
    await page.locator('.range-row .goal-edit-btn-inline').click();
    await page.locator('.goal-editor-modal input').fill('50');
    const saveBtn = page.locator('.goal-editor-modal').getByRole('button', { name: 'Speichern' });
    await expect(saveBtn).toBeDisabled();
  });

  test('should disable Speichern button for empty input', async ({ page }) => {
    await page.locator('.range-row .goal-edit-btn-inline').click();
    await page.locator('.goal-editor-modal input').fill('');
    const saveBtn = page.locator('.goal-editor-modal').getByRole('button', { name: 'Speichern' });
    await expect(saveBtn).toBeDisabled();
  });

  test('should keep modal open on invalid save attempt', async ({ page }) => {
    await page.locator('.range-row .goal-edit-btn-inline').click();
    await page.locator('.goal-editor-modal input').fill('10');
    // Speichern is disabled, so the modal stays open
    await expect(page.locator('.goal-editor-modal')).toBeVisible();
    await expect(page.locator('.range-label')).toContainText('bis 100');
  });

  // ─── Integration: Zahlenraum respected in Übung ──────────────

  test('should carry saved Zahlenraum into Übung exercise', async ({ page }) => {
    // Set Zahlenraum to 200
    await page.locator('.range-row .goal-edit-btn-inline').click();
    await page.locator('.goal-editor-modal input').fill('200');
    await page.locator('.goal-editor-modal').getByRole('button', { name: 'Speichern' }).click();

    // Navigate to Übung by clicking through the UI
    await page.getByRole('link', { name: 'Übung' }).click();
    await expect(page).toHaveURL(/\/mathe\/uebung$/);

    // Exercise page loads and shows a problem
    await expect(page.locator('.operand-display').first()).toBeVisible();

    // Verify the stored value was applied (localStorage persisted)
    const stored = await page.evaluate(() =>
      localStorage.getItem('schlaufuchs-number-range')
    );
    expect(stored).toBe('200');
  });

  test('should carry saved Zahlenraum into Sachaufgaben', async ({ page }) => {
    // Set Zahlenraum to 150
    await page.locator('.range-row .goal-edit-btn-inline').click();
    await page.locator('.goal-editor-modal input').fill('150');
    await page.locator('.goal-editor-modal').getByRole('button', { name: 'Speichern' }).click();

    // Navigate to Sachaufgaben
    await page.getByRole('link', { name: 'Sachaufgaben' }).click();
    await expect(page).toHaveURL(/\/mathe\/sachaufgaben$/);
    await expect(page.locator('.story-text')).toBeVisible();

    const stored = await page.evaluate(() =>
      localStorage.getItem('schlaufuchs-number-range')
    );
    expect(stored).toBe('150');
  });
});
