import { test, expect } from '@playwright/test';
import { createTestCustomer, createTestLoan, enableAllOptionalModules } from './helpers/api';
import { loginAsAdmin } from './helpers/auth';
import {
  isLegacyDataMode,
  resolveLegacyCustomer,
  resolveLegacyLoan,
} from './helpers/legacy-data';
import { expectPageHeading, expectTableHeader, gotoAuthenticated } from './helpers/navigation';

test.describe('Page smoke tests', () => {
  test.beforeAll(async ({ request }) => {
    await enableAllOptionalModules(request);
  });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  const staticPages: Array<{
    path: string;
    heading: string | RegExp;
    tableHeader?: boolean;
  }> = [
    { path: '/', heading: 'Dashboard' },
    { path: '/customers', heading: 'Customers' },
    { path: '/customers/new', heading: 'New Customer' },
    { path: '/loans', heading: 'Pawn Loans' },
    { path: '/loans/new', heading: 'New Pawn Loan' },
    { path: '/part-payments', heading: 'Part Payment' },
    { path: '/part-payments/record', heading: 'Record part payment' },
    { path: '/renewals', heading: /Renewal & Defaults/i },
    { path: '/renewals/record', heading: 'Easy renewal' },
    { path: '/bank-loans', heading: 'Bank Loan' },
    { path: '/bank-loans/record', heading: /Record bank deposit/i },
    { path: '/bank-loans/batch', heading: /Batch bank deposit/i },
    { path: '/auctions', heading: 'Auction' },
    { path: '/inventory', heading: /Inventory/i },
    { path: '/accounts', heading: 'Daily Book & Cash' },
    { path: '/investments', heading: 'Investments' },
    { path: '/gl', heading: 'General Ledger' },
    { path: '/notifications', heading: 'Notifications' },
    { path: '/pay-advances', heading: 'Pay Advances' },
    { path: '/reports', heading: 'Reports' },
    { path: '/settings/organization', heading: /Organization profile/i },
    { path: '/settings/branches', heading: 'Branches' },
    { path: '/settings/preferences', heading: /Application preferences/i },
    { path: '/settings/security/users', heading: 'System users' },
    { path: '/settings/security/roles', heading: 'Permission', tableHeader: true },
    { path: '/settings/security/audit', heading: 'Time', tableHeader: true },
    { path: '/masters/categories', heading: /Commodity categor/i },
    { path: '/masters/sub-categories', heading: /Sub categor/i },
    { path: '/masters/sub-items', heading: /Sub item/i },
    { path: '/masters/interest-declarations', heading: /Interest slab/i },
    { path: '/masters/employees', heading: /Employee/i },
  ];

  for (const { path, heading, tableHeader } of staticPages) {
    test(`loads ${path}`, async ({ page }) => {
      await gotoAuthenticated(page, path);
      if (tableHeader) {
        await expectTableHeader(page, heading);
      } else {
        await expectPageHeading(page, heading);
      }
    });
  }

  test('loads customer detail page', async ({ page, request }) => {
    const customer = isLegacyDataMode()
      ? await resolveLegacyCustomer(request)
      : await createTestCustomer(request);
    await gotoAuthenticated(page, `/customers/${customer.id}`);
    await expect(page.getByRole('heading', { name: customer.name })).toBeVisible();
    await expect(page.getByText('KYC & IDs')).toBeVisible();
  });

  test('loads loan detail, edit, close, and print pages', async ({ page, request }) => {
    let detailLoan: { id: number; invoiceNo: number };
    let activeLoan: { id: number; invoiceNo: number };
    if (isLegacyDataMode()) {
      detailLoan = await resolveLegacyLoan(request);
      activeLoan = await resolveLegacyLoan(request, { open: true });
    } else {
      const customer = await createTestCustomer(request);
      detailLoan = await createTestLoan(request, { customerId: customer.id });
      activeLoan = detailLoan;
    }

    await gotoAuthenticated(page, `/loans/${detailLoan.id}`);
    await expect(page.getByText(`Receipt #${detailLoan.invoiceNo}`)).toBeVisible();

    await gotoAuthenticated(page, `/loans/${activeLoan.id}/edit`);
    await expectPageHeading(page, 'Edit Loan');

    await gotoAuthenticated(page, `/loans/${activeLoan.id}/close`);
    await expect(page.getByText(/Close loan/i).first()).toBeVisible();

    await gotoAuthenticated(page, `/loans/${detailLoan.id}/print`);
    await expect(page.getByText(/Receipt|Pawn/i).first()).toBeVisible();
  });

});

test.describe('Login page', () => {
  test('shows sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Sign in/i })).toBeVisible();
  });
});
