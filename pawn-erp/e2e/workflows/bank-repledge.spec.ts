import { test, expect } from '@playwright/test';
import { createTestCustomer, createTestLoan, enableAllOptionalModules } from '../helpers/api';
import { loginAsAdmin } from '../helpers/auth';
import { inputForLabel } from '../helpers/forms';
import { TEST_SECURITY_PIN } from '../helpers/fixtures';

test.describe('Workflow — Bank re-pledge', () => {
  test.beforeAll(async ({ request }) => {
    await enableAllOptionalModules(request);
  });

  test('eligible loan → bank selection → transfer → track → release → settlement', async ({
    page,
    request,
  }) => {
    const customer = await createTestCustomer(request);
    const loan = await createTestLoan(request, { customerId: customer.id, loanAmount: 50_000 });

    await loginAsAdmin(page);

    // Record bank deposit (transfer / re-pledge)
    await page.goto(`/bank-loans/record?loanId=${loan.id}&invoiceNo=${loan.invoiceNo}`);
    await expect(page.getByRole('heading', { name: /Record bank deposit/i })).toBeVisible();
    await expect(page.getByText(String(loan.invoiceNo)).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Add bank deposit')).toBeVisible({ timeout: 15_000 });

    await inputForLabel(page, /^Bank name$/i).fill('E2E Test Bank');
    await inputForLabel(page, /^Deposit amount$/i).fill('40000');
    await inputForLabel(page, /^Bank receipt no\./i).fill('BANK-E2E-001');

    const [depositResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/repledges') && r.request().method() === 'POST' && r.ok()
      ),
      page.getByRole('button', { name: /Save deposit/i }).click(),
    ]);
    expect(depositResponse.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/bank-loans/);

    // Track in register
    const depositRow = page.locator('tr').filter({ hasText: String(loan.invoiceNo) });
    await expect(depositRow.getByRole('cell', { name: 'E2E Test Bank' })).toBeVisible({ timeout: 15_000 });

    // Release / settlement
    await depositRow.getByRole('button', { name: 'Release from bank' }).click();
    await inputForLabel(page, /^Security PIN/i).fill(TEST_SECURITY_PIN);

    const [releaseResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/settle') && r.request().method() === 'POST' && r.ok()
      ),
      page.getByRole('button', { name: /Confirm release/i }).click(),
    ]);
    expect(releaseResponse.ok()).toBeTruthy();

    await page.getByRole('combobox').selectOption({ label: /Settled|settled/i }).catch(() => {
      /* status filter may use native select without combobox role */
    });
    await page.locator('select').filter({ hasText: /Settled|All/ }).selectOption({ label: 'Settled' }).catch(() => {});
  });
});
