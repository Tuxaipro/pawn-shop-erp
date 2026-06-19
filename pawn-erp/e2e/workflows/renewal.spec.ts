import { test, expect } from '@playwright/test';
import { createTestCustomer, createTestLoan, enableAllOptionalModules } from '../helpers/api';
import { loginAsAdmin } from '../helpers/auth';
import { inputForLabel } from '../helpers/forms';
import { TEST_SECURITY_PIN, uniqueInvoice } from '../helpers/fixtures';

test.describe('Workflow — Loan renewal', () => {
  test.beforeAll(async ({ request }) => {
    await enableAllOptionalModules(request);
  });

  test('calculate dues → collect payment → new loan → receipt → ledger', async ({
    page,
    request,
  }) => {
    const customer = await createTestCustomer(request);
    const loan = await createTestLoan(request, { customerId: customer.id });
    const newInvoiceNo = uniqueInvoice();

    await loginAsAdmin(page);
    await page.goto(`/renewals/record?loanId=${loan.id}&invoiceNo=${loan.invoiceNo}`);

    await expect(page.getByRole('heading', { name: /Easy renewal/i })).toBeVisible();
    await expect(page.getByText(String(loan.invoiceNo)).first()).toBeVisible({ timeout: 15_000 });

    // Settlement preview (calculate dues)
    await expect(page.getByText(/Amount due|Net payable|Interest/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByRole('button', { name: 'Renew & close previous' })).toBeVisible({
      timeout: 15_000,
    });

    await inputForLabel(page, /^New receipt no\./i).fill(String(newInvoiceNo));
    await inputForLabel(page, /^Security PIN/i).fill(TEST_SECURITY_PIN);

    const [renewResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/renew') && r.request().method() === 'POST' && r.ok()
      ),
      page.getByRole('button', { name: 'Renew & close previous' }).click(),
    ]);
    expect(renewResponse.ok()).toBeTruthy();

    await expect(page.getByText(/Loan renewed/i)).toBeVisible({ timeout: 15_000 });

    const renewedBody = await renewResponse.json();
    const newLoanId = renewedBody.data?.newLoan?.id ?? renewedBody.data?.loanId;
    expect(newLoanId).toBeTruthy();

    // New loan receipt
    await page.goto(`/loans/${newLoanId}/print`);
    await expect(page.getByText(String(newInvoiceNo)).first()).toBeVisible();

    // Ledger / accounts reflects activity
    await page.goto('/accounts');
    await expect(page.getByRole('heading', { name: 'Daily Book & Cash' })).toBeVisible();
    await expect(page.getByText(/Opening|Closing|Cash/i).first()).toBeVisible();
  });
});
