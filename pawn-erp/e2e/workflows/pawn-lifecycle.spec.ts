import { test, expect } from '@playwright/test';
import { enableAllOptionalModules } from '../helpers/api';
import { loginAsAdmin } from '../helpers/auth';
import {
  fillMinimalCustomerForm,
  fillMinimalLoanForm,
  inputForLabel,
  saveCustomerForm,
  submitLoanForm,
} from '../helpers/forms';
import { uniqueName } from '../helpers/fixtures';

test.describe('Workflow — New customer to inventory & notifications', () => {
  test.beforeAll(async ({ request }) => {
    await enableAllOptionalModules(request);
  });

  test('customer → KYC section → pawn loan → receipt → inventory → notifications', async ({
    page,
  }) => {
    const customerName = uniqueName('E2E-Flow');

    await loginAsAdmin(page);

    // Customer + KYC profile
    await page.goto('/customers/new');
    await expect(page.getByRole('heading', { name: 'New Customer' })).toBeVisible();
    await fillMinimalCustomerForm(page, customerName);
    await expect(page.getByText('KYC Documents')).toBeVisible();
    await saveCustomerForm(page);
    await expect(page).toHaveURL(/\/customers\/\d+/);
    await expect(page.getByRole('heading', { name: customerName })).toBeVisible();
    await expect(page.getByText('KYC & IDs')).toBeVisible();

    const customerUrl = page.url();
    const customerId = customerUrl.match(/\/customers\/(\d+)/)?.[1];
    expect(customerId).toBeTruthy();

    // Pawn item + valuation + loan
    await page.goto(`/loans/new?customerId=${customerId}`);
    await expect(page.getByRole('heading', { name: 'New Pawn Loan' })).toBeVisible();
    await expect(page.getByText(customerName)).toBeVisible();

    const { invoiceNo } = await fillMinimalLoanForm(page);
    await submitLoanForm(page);
    await expect(page).toHaveURL(/\/loans\/\d+/);
    await expect(page.getByText(`Receipt #${invoiceNo}`)).toBeVisible();

    const loanUrl = page.url();
    const loanId = loanUrl.match(/\/loans\/(\d+)/)?.[1];
    expect(loanId).toBeTruthy();

    // Receipt (print view)
    await page.goto(`/loans/${loanId}/print`);
    await expect(page.getByText(String(invoiceNo)).first()).toBeVisible();

    // Inventory — collateral should appear for this receipt
    await page.goto('/inventory');
    await expect(page.getByRole('heading', { name: /Inventory/i })).toBeVisible();
    await inputForLabel(page, /^Receipt no\./i).fill(String(invoiceNo));
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText(String(invoiceNo)).first()).toBeVisible({ timeout: 15_000 });

    // Notifications queue (module enabled in beforeAll)
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  });
});
