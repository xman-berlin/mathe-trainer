import { Page } from '@playwright/test';

const TEST_USER = {
  id: 'test-user-e2e',
  username: 'E2E Tester',
  avatar_style: 'adventurer',
  created_at: new Date().toISOString(),
  last_active_at: new Date().toISOString(),
};

/**
 * Bypass login by injecting a test user into localStorage
 * Call this before navigating to protected routes
 */
export async function bypassLogin(page: Page): Promise<void> {
  await page.addInitScript((user) => {
    localStorage.setItem('schlaufuchs-current-user', JSON.stringify(user));
  }, TEST_USER);
}

/**
 * Handle the migration dialog that appears on first visit
 */
export async function handleMigrationDialog(page: Page): Promise<void> {
  const migrationBtn = page.getByRole('button', { name: 'Frisch beginnen' });
  if (await migrationBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await migrationBtn.click();
    await migrationBtn.waitFor({ state: 'hidden', timeout: 5000 });
  }
}

/**
 * Set user directly in localStorage before navigation
 * Use this when bypassLogin doesn't work (e.g., for pages that check auth immediately)
 */
export async function setUserDirectly(page: Page): Promise<void> {
  await page.evaluate((user) => {
    localStorage.setItem('schlaufuchs-current-user', JSON.stringify(user));
  }, TEST_USER);
}