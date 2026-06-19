import type { APIRequestContext } from '@playwright/test';
import { TEST_SECURITY_PIN, uniqueInvoice, uniqueMobile, uniqueName } from './fixtures';

const API_BASE = 'http://localhost:3002/api/v1';
export const DEFAULT_BRANCH_ID = 1;

export const TEST_ADMIN = {
  email: 'admin@pawn.local',
  password: 'admin123',
};

export interface ApiAuth {
  token: string;
  headers: Record<string, string>;
}

export async function apiLogin(request: APIRequestContext): Promise<ApiAuth> {
  const res = await request.post(`${API_BASE}/auth/login`, { data: TEST_ADMIN });
  const body = await res.json();
  if (!res.ok()) {
    throw new Error(`API login failed: ${JSON.stringify(body)}`);
  }
  const token = body.data.token as string;
  return {
    token,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

export async function enableAllOptionalModules(request: APIRequestContext) {
  const auth = await apiLogin(request);
  const res = await request.put(`${API_BASE}/settings/preferences`, {
    headers: auth.headers,
    data: {
      modules: {
        bankLoans: true,
        auctions: true,
        investments: true,
        gl: true,
        notifications: true,
      },
    },
  });
  if (!res.ok()) {
    const body = await res.json();
    throw new Error(`Enable modules failed: ${JSON.stringify(body)}`);
  }
}

export async function createTestCustomer(
  request: APIRequestContext,
  opts?: { name?: string; mobile?: string }
) {
  const auth = await apiLogin(request);
  const nextRes = await request.get(`${API_BASE}/customers/next-id`, { headers: auth.headers });
  const nextBody = await nextRes.json();
  if (!nextRes.ok()) {
    throw new Error(`next-id failed: ${JSON.stringify(nextBody)}`);
  }

  const name = opts?.name ?? uniqueName('E2E-Customer');
  const res = await request.post(`${API_BASE}/customers`, {
    headers: auth.headers,
    data: {
      customerId: nextBody.data.customerId,
      name,
      fatherHusbandName: 'E2E Father',
      address1: '123 Test Street',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600001',
      mobileNo: opts?.mobile ?? uniqueMobile(),
    },
  });
  const body = await res.json();
  if (!res.ok()) {
    throw new Error(`Create customer failed: ${JSON.stringify(body)}`);
  }
  return body.data as { id: number; customerId: number; name: string };
}

async function getLoanFormOptions(request: APIRequestContext, auth: ApiAuth) {
  const res = await request.get(`${API_BASE}/loans/form-options?commodityType=gold`, {
    headers: auth.headers,
  });
  const body = await res.json();
  if (!res.ok()) {
    throw new Error(`form-options failed: ${JSON.stringify(body)}`);
  }
  return body.data as {
    defaultLoanDate: string;
    subCategories: Array<{ id: number; nameEn: string }>;
  };
}

export async function createTestLoan(
  request: APIRequestContext,
  opts: {
    customerId: number;
    invoiceNo?: number;
    loanAmount?: number;
    loanDate?: string;
  }
) {
  const auth = await apiLogin(request);
  const options = await getLoanFormOptions(request, auth);
  const chainSub = options.subCategories.find((s) => s.nameEn === 'Chain');
  if (!chainSub) {
    throw new Error('Chain sub-category not found — run database seed');
  }

  const subItemsRes = await request.get(
    `${API_BASE}/commodities/sub-items?subCategoryId=${chainSub.id}&commodityType=gold`,
    { headers: auth.headers }
  );
  const subItemsBody = await subItemsRes.json();
  if (!subItemsRes.ok()) {
    throw new Error(`sub-items failed: ${JSON.stringify(subItemsBody)}`);
  }
  const subItems = subItemsBody.data as Array<{ id: number }>;
  if (!subItems.length) {
    throw new Error('No sub-items for Chain sub-category');
  }

  const invoiceNo = opts.invoiceNo ?? uniqueInvoice();
  const loanAmount = opts.loanAmount ?? 10_000;
  const loanDate = opts.loanDate ?? options.defaultLoanDate;

  const res = await request.post(`${API_BASE}/loans`, {
    headers: auth.headers,
    data: {
      branchId: DEFAULT_BRANCH_ID,
      customerId: opts.customerId,
      invoiceNo,
      loanDate,
      commodityType: 'gold',
      loanCondition: 'general',
      loanCustomerType: 'general',
      loanAmount,
      loanAmountWords: 'Ten thousand Rupees only',
      items: [
        {
          subCategoryId: chainSub.id,
          itemId: subItems[0].id,
          purityId: 1,
          noOfItems: 1,
          netWeight: 10,
        },
      ],
    },
  });
  const body = await res.json();
  if (!res.ok()) {
    throw new Error(`Create loan failed: ${JSON.stringify(body)}`);
  }
  return body.data as { id: number; invoiceNo: number; renewalDate: string };
}

export async function renewLoanViaApi(
  request: APIRequestContext,
  loanId: number,
  opts?: { newInvoiceNo?: number; newLoanAmount?: number }
) {
  const auth = await apiLogin(request);
  const options = await getLoanFormOptions(request, auth);
  const res = await request.post(`${API_BASE}/renewals/${loanId}/renew`, {
    headers: auth.headers,
    data: {
      branchId: DEFAULT_BRANCH_ID,
      newInvoiceNo: opts?.newInvoiceNo ?? uniqueInvoice(),
      newLoanAmount: opts?.newLoanAmount ?? 10_000,
      loanAmountWords: 'Ten thousand Rupees only',
      loanDate: options.defaultLoanDate,
      interestDisAmt: 0,
      securityPin: TEST_SECURITY_PIN,
    },
  });
  const body = await res.json();
  if (!res.ok()) {
    throw new Error(`Renew loan failed: ${JSON.stringify(body)}`);
  }
  return body.data;
}
