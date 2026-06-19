import { api, withBranch } from './client';

export interface BankLoanListItem {
  id: number;
  loanId: number;
  invoiceNo: number;
  customerName: string;
  customerId: number;
  mobileNo: string;
  bankName: string;
  receiptNo: string;
  depositAmount: number;
  depositDate: string | null;
  closingDate: string | null;
  isBankSettled: boolean;
}

export interface EligibleLoanItem {
  id: number;
  invoiceNo: number;
  customerName: string;
  customerId: number;
  mobileNo: string;
  loanAmount: number;
  netWeightGold: number;
  netWeightSilver: number;
  commodityTypeId: number;
}

export const bankLoansApi = {
  list: (
    branchId: number,
    params: {
      page?: number;
      limit?: number;
      fromDate?: string;
      toDate?: string;
      search?: string;
      loanId?: number;
      isSettled?: boolean;
    } = {}
  ) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.fromDate) q.set('fromDate', params.fromDate);
    if (params.toDate) q.set('toDate', params.toDate);
    if (params.search) q.set('search', params.search);
    if (params.loanId) q.set('loanId', String(params.loanId));
    if (params.isSettled !== undefined) q.set('isSettled', String(params.isSettled));
    const qs = q.toString();
    return api.get<{
      items: BankLoanListItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(withBranch(`/repledges${qs ? `?${qs}` : ''}`, branchId));
  },
  eligibleLoans: (branchId: number, params: { search?: string; page?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return api.get<{
      items: EligibleLoanItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(withBranch(`/repledges/eligible-loans${qs ? `?${qs}` : ''}`, branchId));
  },
  create: (
    branchId: number,
    data: {
      loanId: number;
      bankName: string;
      depositAmount: number;
      depositDate: string;
      receiptNo?: string;
    }
  ) => api.post('/repledges', { ...data, branchId }),
  createBatch: (
    branchId: number,
    data: {
      bankName: string;
      depositDate: string;
      receiptNo?: string;
      items: Array<{ loanId: number; depositAmount: number }>;
    }
  ) =>
    api.post<{ created: Array<{ id: number; loanId: number }>; successCount: number; errorCount: number }>(
      '/repledges/batch',
      { ...data, branchId }
    ),
  release: (id: number, branchId: number, data: { closingDate: string; securityPin: string }) =>
    api.post(withBranch(`/repledges/${id}/settle`, branchId), data),
};
