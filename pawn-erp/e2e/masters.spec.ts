import { test, expect } from '@playwright/test';
import { loginAsAdmin, openMasterData, uniqueName } from './helpers/auth';

test.describe('Master Data — Commodity Category', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await openMasterData(page);
    await page.getByTestId('master-nav-categories').click();
    await expect(page.getByTestId('master-category-page')).toBeVisible();
  });

  test('shows required asterisk on English name field', async ({ page }) => {
    const label = page.getByTestId('category-add-form').locator('label').filter({ hasText: /^Name \(English\)/ });
    await expect(label.locator('span.text-red-600')).toHaveText(' *');
  });

  test('creates a new commodity category', async ({ page }) => {
    const name = uniqueName('E2E-Category');
    await page.getByTestId('category-name-en-input').fill(name);
    await page.getByTestId('category-name-ta-input').fill('சோதனை');
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/masters/categories') && r.request().method() === 'POST'
      ),
      page.getByTestId('category-add-btn').click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await expect(page.getByTestId('category-table')).toContainText(name);
    await expect(page.getByTestId('category-table')).toContainText('சோதனை');
  });
});

test.describe('Master Data — Commodity Sub Category', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await openMasterData(page);
    await page.getByTestId('master-nav-sub-categories').click();
    await expect(page.getByTestId('master-sub-category-page')).toBeVisible();
  });

  test('shows required asterisks on category and English name', async ({ page }) => {
    const form = page.getByTestId('sub-category-add-form');
    await expect(form.locator('label').filter({ hasText: /^Commodity Category/ }).locator('span.text-red-600')).toHaveText(' *');
    await expect(form.locator('label').filter({ hasText: /^Name \(English\)/ }).locator('span.text-red-600')).toHaveText(' *');
  });

  test('creates a sub category under Gold', async ({ page }) => {
    const name = uniqueName('E2E-SubCat');
    await page.getByTestId('sub-category-category-select').selectOption({ label: 'Gold' });
    await page.getByTestId('sub-category-name-en-input').fill(name);
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/masters/sub-categories') && r.request().method() === 'POST'
      ),
      page.getByTestId('sub-category-add-btn').click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await expect(page.getByTestId('sub-category-table')).toContainText(name);
    await expect(page.getByTestId('sub-category-table')).toContainText('Gold');
  });
});

test.describe('Master Data — Commodity Sub Item', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await openMasterData(page);
    await page.getByTestId('master-nav-sub-items').click();
    await expect(page.getByTestId('master-sub-item-page')).toBeVisible();
  });

  test('shows required asterisks on form fields', async ({ page }) => {
    const form = page.getByTestId('sub-item-add-form');
    await expect(form.locator('label').filter({ hasText: /^Commodity Category/ }).locator('span.text-red-600')).toHaveText(' *');
    await expect(form.locator('label').filter({ hasText: /^Sub Category/ }).locator('span.text-red-600')).toHaveText(' *');
    await expect(form.locator('label').filter({ hasText: /^Name \(English\)/ }).locator('span.text-red-600')).toHaveText(' *');
  });

  test('creates a sub item with cascading selects', async ({ page }) => {
    const name = uniqueName('E2E-Item');
    await page.getByTestId('sub-item-category-select').selectOption({ label: 'Gold' });
    await page.getByTestId('sub-item-sub-category-select').selectOption({ label: 'Chain' });
    await page.getByTestId('sub-item-name-en-input').fill(name);
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/masters/sub-items') && r.request().method() === 'POST'
      ),
      page.getByTestId('sub-item-add-btn').click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await expect(page.getByTestId('sub-item-table')).toContainText(name);
  });
});

test.describe('Master Data — Interest Declaration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await openMasterData(page);
    await page.getByTestId('master-nav-interest-declarations').click();
    await expect(page.getByTestId('master-interest-page')).toBeVisible();
  });

  test('shows required asterisks on slab form', async ({ page }) => {
    const form = page.getByTestId('interest-add-form');
    for (const labelText of [
      'Commodity Category',
      'Min amount',
      'Max amount',
      'General customer rate',
      'Other shop rate',
    ]) {
      await expect(
        form.locator('label').filter({ hasText: new RegExp(`^${labelText}`) }).locator('span.text-red-600')
      ).toHaveText(' *');
    }
  });

  test('lists interest slabs for selected category', async ({ page }) => {
    await page.getByTestId('interest-category-select').selectOption({ label: 'Gold' });
    await expect(page.getByTestId('interest-table')).toBeVisible();
    await expect(page.getByTestId('interest-table')).toContainText('₹');
  });
});

test.describe('Master Data — Navigation', () => {
  test('Master Data menu is next to Dashboard with icon', async ({ page }) => {
    await loginAsAdmin(page);
    const dashboard = page.getByTestId('nav-dashboard').first();
    const masters = page.getByTestId('nav-masters').first();
    await expect(dashboard).toBeVisible();
    await expect(masters).toBeVisible();

    const dashboardBox = await dashboard.boundingBox();
    const mastersBox = await masters.boundingBox();
    expect(dashboardBox).not.toBeNull();
    expect(mastersBox).not.toBeNull();
    expect(mastersBox!.y).toBeGreaterThan(dashboardBox!.y);
    await expect(masters.locator('svg')).toBeVisible();
  });

  test('does not show tax declarations tab', async ({ page }) => {
    await loginAsAdmin(page);
    await openMasterData(page);
    await expect(page.getByTestId('master-nav-tax-declarations')).toHaveCount(0);
  });
});
