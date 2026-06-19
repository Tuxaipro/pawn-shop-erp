import { test, expect } from '@playwright/test';
import { createTestCustomer, createTestLoan, enableAllOptionalModules } from '../helpers/api';
import { loginAsAdmin } from '../helpers/auth';
import { inputForLabel } from '../helpers/forms';

test.describe('Workflow — Part payment', () => {
  test.beforeAll(async ({ request }) => {
    await enableAllOptionalModules(request);
  });

  test('loan lookup → calculate interest → collect payment → update register', async ({
    page,
    request,
  }) => {
    const customer = await createTestCustomer(request);
    const loan = await createTestLoan(request, { customerId: customer.id, loanAmount: 20_000 });

    await loginAsAdmin(page);
    await page.goto(`/part-payments/record?loanId=${loan.id}&invoiceNo=${loan.invoiceNo}`);

    await expect(page.getByText(String(loan.invoiceNo)).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Amount to pay|Interest|Capital/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByText('Add part payment')).toBeVisible({ timeout: 15_000 });

    await inputForLabel(page, /^Amount$/i).fill('500');
    const [payResponse] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/interest/part-payments') && r.request().method() === 'POST' && r.ok()
      ),
      page.getByRole('button', { name: 'Save payment' }).click(),
    ]);
    expect(payResponse.ok()).toBeTruthy();

    await page.goto('/part-payments');
    await expect(page.getByRole('cell', { name: '₹500.00' }).first()).toBeVisible({ timeout: 15_000 });
  });
});
