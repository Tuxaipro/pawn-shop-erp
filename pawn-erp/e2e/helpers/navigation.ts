import { expect, type Page } from '@playwright/test';

export async function expectPageHeading(page: Page, heading: string | RegExp) {
  await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 15_000 });
}

export async function expectTableHeader(page: Page, text: string | RegExp) {
  await expect(page.getByRole('columnheader', { name: text }).first()).toBeVisible({ timeout: 15_000 });
}

export async function gotoAuthenticated(page: Page, path: string) {
  await page.goto(path);
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}
