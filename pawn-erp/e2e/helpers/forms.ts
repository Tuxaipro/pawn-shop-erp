import { expect, type Page } from '@playwright/test';
import { TEST_SECURITY_PIN, uniqueInvoice, uniqueName } from './fixtures';

function inputForLabel(page: Page, label: string | RegExp) {
  return page
    .locator('label')
    .filter({ hasText: label })
    .locator('xpath=ancestor::div[contains(@class,"space-y-1.5")]')
    .locator('input, select, textarea')
    .first();
}

export async function fillMinimalCustomerForm(page: Page, name = uniqueName('E2E-Customer')) {
  await expect(page.getByRole('button', { name: 'Save Customer' })).toBeVisible({ timeout: 15_000 });
  await inputForLabel(page, /^Customer Name/).fill(name);
  await inputForLabel(page, /^Father \/ Husband Name/).fill('E2E Father');
  await inputForLabel(page, /^Address Line 1/).fill('123 Test Street');
  await inputForLabel(page, /^City/).fill('Chennai');
  await inputForLabel(page, /^State/).fill('Tamil Nadu');
  await inputForLabel(page, /^Postal Code/).fill('600001');
  await inputForLabel(page, /^Mobile No/).fill(`9${String(Date.now()).slice(-9)}`);
  return name;
}

export async function saveCustomerForm(page: Page) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/customers') && r.request().method() === 'POST' && r.ok()
    ),
    page.getByRole('button', { name: 'Save Customer' }).click(),
  ]);
  expect(response.ok()).toBeTruthy();
}

export async function fillLoanCollateral(page: Page) {
  const card = page
    .getByRole('heading', { name: 'Collateral Items' })
    .locator('xpath=ancestor::div[contains(@class,"rounded-xl")]');
  const subCat = card.locator('select').nth(0);
  await expect.poll(async () => subCat.locator('option').count(), { timeout: 15_000 }).toBeGreaterThan(1);
  await subCat.selectOption({ index: 1 });

  const itemSelect = card.locator('select').nth(1);
  await expect.poll(async () => itemSelect.locator('option').count(), { timeout: 15_000 }).toBeGreaterThan(1);
  await itemSelect.selectOption({ index: 1 });

  const puritySelect = card.locator('select').nth(2);
  if (await puritySelect.isVisible()) {
    await puritySelect.selectOption({ index: 1 });
  }

  const qty = card.locator('input[type="number"]').nth(0);
  const netWt = card.locator('input[type="number"]').nth(1);
  await qty.fill('1');
  await netWt.fill('10');
}

export async function fillMinimalLoanForm(page: Page, opts?: { invoiceNo?: number; amount?: number }) {
  const invoiceNo = opts?.invoiceNo ?? uniqueInvoice();
  const amount = opts?.amount ?? 10_000;

  await inputForLabel(page, /^Receipt No/).fill(String(invoiceNo));
  await inputForLabel(page, /^Loan Amount/).fill(String(amount));
  await fillLoanCollateral(page);
  return { invoiceNo, amount };
}

export async function submitLoanForm(page: Page) {
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/loans') && r.request().method() === 'POST' && r.ok()),
    page.getByRole('button', { name: 'Create Loan' }).click(),
  ]);
  expect(response.ok()).toBeTruthy();
}

export async function fillSecurityPinIfVisible(page: Page, pin = TEST_SECURITY_PIN) {
  const pinField = inputForLabel(page, /^Security PIN/);
  if (await pinField.isVisible()) {
    await pinField.fill(pin);
  }
}

export { inputForLabel };
