import { Page, expect } from '@playwright/test';
import { TEST_ADMIN } from './api';

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(TEST_ADMIN.email);
  await page.getByTestId('login-password').fill(TEST_ADMIN.password);
  await page.getByTestId('login-submit').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
}

export async function openMasterData(page: Page) {
  await page.goto('/masters/categories');
  await expect(page).toHaveURL(/\/masters/);
}

export { uniqueName } from './fixtures';
