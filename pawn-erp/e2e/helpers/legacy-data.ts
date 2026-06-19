import type { APIRequestContext } from '@playwright/test';
import { apiLogin } from './api';

const API_BASE = 'http://localhost:3002/api/v1';

/** Known stable records from pawnshop26.sql import. */
export const LEGACY_FIXTURES = {
  customerBusinessId: 1000,
  customerDbId: 1,
  /** First imported loan (settled — use for detail/print). */
  closedLoanDbId: 1,
  closedLoanReceiptNo: 1014788,
  /** Recent open loan (use for edit/close flows). */
  openLoanDbId: 54717,
  openLoanReceiptNo: 92288,
} as const;

export function isLegacyDataMode() {
  return process.env.LEGACY_DATA === '1' || process.env.LEGACY_DATA === 'true';
}

export async function resolveLegacyCustomer(request: APIRequestContext) {
  const auth = await apiLogin(request);
  const res = await request.get(`${API_BASE}/customers/${LEGACY_FIXTURES.customerDbId}`, {
    headers: auth.headers,
  });
  const body = await res.json();
  if (!res.ok()) {
    throw new Error(`Legacy customer fetch failed: ${JSON.stringify(body)}`);
  }
  return body.data as { id: number; customerId: number; name: string };
}

export async function resolveLegacyLoan(
  request: APIRequestContext,
  opts?: { open?: boolean }
) {
  const auth = await apiLogin(request);
  const loanId = opts?.open ? LEGACY_FIXTURES.openLoanDbId : LEGACY_FIXTURES.closedLoanDbId;
  const res = await request.get(`${API_BASE}/loans/${loanId}`, {
    headers: auth.headers,
  });
  const body = await res.json();
  if (!res.ok()) {
    throw new Error(`Legacy loan fetch failed: ${JSON.stringify(body)}`);
  }
  return body.data as { id: number; invoiceNo: number; customerId: number };
}
