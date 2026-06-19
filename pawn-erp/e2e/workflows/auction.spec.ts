import { test, expect } from '@playwright/test';
import {
  createTestCustomer,
  createTestLoan,
  enableAllOptionalModules,
} from '../helpers/api';
import { loginAsAdmin } from '../helpers/auth';
import { yearsAgoISO } from '../helpers/fixtures';

test.describe('Workflow — Auction', () => {
  test.beforeAll(async ({ request }) => {
    await enableAllOptionalModules(request);
  });

  test('expired loan → notice → legal period → auction → settlement → close', async ({
    page,
    request,
  }) => {
    const customer = await createTestCustomer(request);
    const loan = await createTestLoan(request, {
      customerId: customer.id,
      loanAmount: 15_000,
      loanDate: yearsAgoISO(2),
    });

    await loginAsAdmin(page);
    await page.goto('/auctions');
    await expect(page.getByRole('heading', { name: 'Auction' }).first()).toBeVisible();

    // Eligible overdue loan should appear
    const loanSelect = page.locator('select').filter({ hasText: /Select overdue loan/ });
    await expect(loanSelect.locator(`option[value="${loan.id}"]`)).toHaveCount(1, {
      timeout: 15_000,
    });

    // Issue notice
    await loanSelect.selectOption(String(loan.id));
    const [noticeResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/auctions') && r.request().method() === 'POST' && r.ok()
      ),
      page.getByRole('button', { name: 'Issue notice' }).click(),
    ]);
    expect(noticeResponse.ok()).toBeTruthy();

    await expect(page.getByText(String(loan.invoiceNo))).toBeVisible({ timeout: 15_000 });
    const row = page.locator('tr').filter({ hasText: String(loan.invoiceNo) });
    await expect(row.locator('label').filter({ hasText: 'Legal' })).toBeVisible();

    // Record auction sale
    await row.getByPlaceholder('Amount').fill('50000');
    await row.getByPlaceholder('Buyer').fill('E2E Auction Buyer');
    const [saleResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/sale') && r.request().method() === 'POST' && r.ok()
      ),
      row.getByRole('button', { name: 'Record sale' }).click(),
    ]);
    expect(saleResponse.ok()).toBeTruthy();

    // Complete auction / settlement
    await expect(row.getByRole('button', { name: 'Complete' })).toBeVisible({ timeout: 15_000 });
    const [completeResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/complete') && r.request().method() === 'POST' && r.ok()
      ),
      row.getByRole('button', { name: 'Complete' }).click(),
    ]);
    expect(completeResponse.ok()).toBeTruthy();

    // Close account — loan should no longer be open
    await page.goto(`/loans/${loan.id}`);
    await expect(page.getByText(/Closed|completed|auction/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
