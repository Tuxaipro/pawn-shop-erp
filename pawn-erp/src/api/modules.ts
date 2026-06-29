import { api, withBranch } from './client';

export interface DashboardSummary {
  branchId: number;
  daily: {
    newCustomers: number;
    newLoans: number;
    todayIncome: number;
    todayExpense: number;
    todayNet: number;
    interestCollection: number;
    cashInHand: number;
    auctionAlerts: number;
  };
  monthly: {
    revenue: number;
    expense: number;
    profit: number;
    outstanding: number;
    investments: number;
  };
  stock: {
    goldWeight: number;
    silverWeight: number;
    goldLoans: number;
    silverLoans: number;
  };
  counts: {
    openLoans: number;
    overdueLoans: number;
    openBankDeposits: number;
    pendingAuctions: number;
  };
  widgets: {
    pendingRenewals: number;
    openBankDeposits: number;
    pendingAuctions: number;
    auctionNotices: Array<{
      id: number;
      loanId: number;
      invoiceNo: number;
      customerName: string;
      auctionDate: string | null;
      status: string;
    }>;
    recentOverdue: Array<{
      id: number;
      invoiceNo: number;
      customerName: string;
      renewalDate: string;
      loanAmount: number;
    }>;
    openBankDepositsList: Array<{
      id: number;
      invoiceNo: number;
      customerName: string;
      bankName: string;
      depositAmount: number;
      depositDate: string | null;
    }>;
  };
  branchPerformance?: Array<{
    branchId: number;
    branchName: string;
    branchCode: string;
    openLoans: number;
    overdueLoans: number;
    outstanding: number;
    todayNet: number;
    monthProfit: number;
    loansToday: number;
    interestToday: number;
    cashInHand: number;
  }>;
  enterprise: {
    today: {
      newCustomers: number;
      newCustomersDeltaPct: number | null;
      newLoans: number;
      newLoansAmount: number;
      newLoansDeltaPct: number | null;
      interestCollected: number;
      interestDeltaPct: number | null;
      partialPayments: number;
      partialPaymentsAmount: number;
      releasedLoans: number;
      releasedAmount: number;
      expenses: number;
    };
    financial: {
      cashInHand: number;
      cashChange: number;
      cashLimit: number;
      cashOverLimit: boolean;
      excessCash: number;
      bankBalance: number;
      outstandingLoans: number;
      investments: number;
      monthlyProfit: number;
      todayNet: number;
    };
    inventory: {
      gold: { weight: number; loans: number };
      silver: { weight: number; loans: number };
      bankPledged: { weight: number; loans: number };
      auctionStock: { weight: number; loans: number };
      released: { weight: number };
    };
    portfolio: {
      openLoans: number;
      dueToday: number;
      overdue: number;
      renewalDue: number;
      npa: number;
      auctionEligible: number;
    };
    bankRepledge: {
      activeBanks: number;
      batches: number;
      outstanding: number;
      maturityThisMonth: number;
      overdue: number;
    };
    auction: {
      notices: number;
      legalWaiting: number;
      scheduled: number;
      completed: number;
    };
    charts: {
      dailyCollections: Array<{ label: string; amount: number }>;
      loanTrend: Array<{ label: string; count: number }>;
      goldVsSilver: { gold: number; silver: number };
      incomeVsExpense: { income: number; expense: number };
      branchComparison: Array<{ name: string; value: number }>;
      loanStatus: Array<{ label: string; count: number; pct: number }>;
      itemDistribution: Array<{ label: string; pct: number }>;
    };
    alerts: Array<{ level: string; message: string; count: number; href: string }>;
    insights: string[];
    activity: Array<{ time: string; message: string }>;
    kpi: Array<{ label: string; pct: number }>;
    branchMap: Array<{ name: string; outstanding: number }>;
  };
  openLoans: number;
  overdueLoans: number;
  totalOutstanding: number;
  openBankDeposits: number;
  pendingAuctions: number;
  todayIncome: number;
}

export const dashboardApi = {
  summary: (branchId: number) =>
    api.get<DashboardSummary>(withBranch('/dashboard/summary', branchId)),
};

export interface InterestResult {
  loanId: number;
  invoiceNo: number;
  loanAmount: number;
  interestRate: number;
  loanDate: string;
  partPayments: Array<{ id: number; amount: number; payDate: string }>;
  calculation?: {
    interestAmount: number;
    totalPayable: number;
    netPayable: number;
    totalMonths: number;
    partPaymentTotal: number;
    dateBreakdown: string;
  } | null;
}

export interface PartPaymentListItem {
  id: number;
  loanId: number;
  invoiceNo: number;
  customerName: string;
  customerId: number;
  mobileNo: string;
  amount: number;
  payDate: string;
}

export interface StockCheckResult {
  inStock: boolean;
  invoiceNo?: number;
  customerName?: string;
  loanAmount?: number;
  message?: string;
  items?: Array<{ item: string; netWeight: number }>;
}

export const interestApi = {
  forLoan: (loanId: number, branchId: number, asOf?: string) =>
    api.get<InterestResult>(
      withBranch(`/interest/loan/${loanId}${asOf ? `?asOf=${asOf}` : ''}`, branchId)
    ),
  listBranchPartPayments: (
    branchId: number,
    params: {
      page?: number;
      limit?: number;
      fromDate?: string;
      toDate?: string;
      search?: string;
    } = {}
  ) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.fromDate) q.set('fromDate', params.fromDate);
    if (params.toDate) q.set('toDate', params.toDate);
    if (params.search) q.set('search', params.search);
    const qs = q.toString();
    return api.get<{
      items: PartPaymentListItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(withBranch(`/interest/part-payments${qs ? `?${qs}` : ''}`, branchId));
  },
  listLoanPartPayments: (loanId: number, branchId: number) =>
    api.get<Array<{ id: number; loanId: number; amount: number; payDate: string }>>(
      withBranch(`/interest/part-payments?loanId=${loanId}`, branchId)
    ),
  addPartPayment: (branchId: number, data: { loanId: number; amount: number; payDate: string }) =>
    api.post('/interest/part-payments', { ...data, branchId }),
  updatePartPayment: (
    id: number,
    branchId: number,
    data: { amount: number; payDate: string }
  ) => api.put(withBranch(`/interest/part-payments/${id}`, branchId), { ...data, branchId }),
  deletePartPayment: (id: number, branchId: number) =>
    api.delete(withBranch(`/interest/part-payments/${id}`, branchId)),
};

export interface RenewalPreview {
  loanId: number;
  invoiceNo: number;
  customerName: string;
  loanAmount: number;
  interestRate: number;
  partPaymentTotal: number;
  calculation: {
    interestAmount: number;
    totalPayable: number;
    netPayable: number;
    totalMonths: number;
    partPaymentTotal: number;
    dateBreakdown: string;
  } | null;
  canClose: boolean;
  canRenew: boolean;
  openBankDeposit: boolean;
}

export interface RenewLoanInput {
  newInvoiceNo: number;
  newLoanAmount: number;
  loanAmountWords: string;
  loanDate: string;
  interestDisAmt?: number;
  securityPin: string;
}

export interface RenewLoanResult {
  oldLoanId: number;
  oldInvoiceNo: number;
  newLoan: {
    id: number;
    invoiceNo: number;
    loanAmount: number;
    renewalDate: string;
    settlementStatus: number;
  };
}

export const renewalsApi = {
  defaults: (branchId: number, page = 1) =>
    api.get<{
      items: Array<{
        id: number;
        invoiceNo: number;
        customerName: string;
        renewalDate: string;
        loanAmount: number;
        defaultStatus: boolean;
        isOverdue: boolean;
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(withBranch(`/renewals/defaults?page=${page}`, branchId)),
  preview: (loanId: number, branchId: number, asOf?: string) =>
    api.get<RenewalPreview>(
      withBranch(`/renewals/preview/${loanId}${asOf ? `?asOf=${asOf}` : ''}`, branchId)
    ),
  close: (loanId: number, branchId: number, data: object) =>
    api.post(withBranch(`/renewals/${loanId}/close`, branchId), data),
  renew: (loanId: number, branchId: number, data: RenewLoanInput) =>
    api.post<RenewLoanResult>(withBranch(`/renewals/${loanId}/renew`, branchId), data),
};

export const repledgesApi = {
  list: (branchId: number, params?: { loanId?: number; isSettled?: boolean; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.loanId) q.set('loanId', String(params.loanId));
    if (params?.isSettled !== undefined) q.set('isSettled', String(params.isSettled));
    if (params?.page) q.set('page', String(params.page));
    const qs = q.toString();
    return api.get(withBranch(`/repledges${qs ? `?${qs}` : ''}`, branchId));
  },
  create: (branchId: number, data: object) =>
    api.post('/repledges', { ...data, branchId }),
  settle: (id: number, branchId: number, data: object) =>
    api.post(withBranch(`/repledges/${id}/settle`, branchId), data),
};

export interface StockSearchItem {
  loanId: number;
  invoiceNo: number;
  status: string;
  customerName: string;
  customerId: number;
  mobileNo: string;
  loanDate: string;
  renewalDate: string;
  loanAmount: number;
  commodityTypeId: number;
  commodityLabel: string;
  netWeightGold: number;
  netWeightSilver: number;
  totalWeight: number;
  itemCount: number;
  items: Array<{
    subCategory: string;
    item: string;
    purity: string;
    noOfItems: number;
    netWeight: number;
  }>;
}

export const inventoryApi = {
  search: (
    branchId: number,
    params: {
      invoiceNo?: number;
      search?: string;
      status?: string;
      commodityType?: 'gold' | 'silver';
      minWeight?: number;
      maxWeight?: number;
      page?: number;
      limit?: number;
    } = {}
  ) => {
    const q = new URLSearchParams();
    if (params.invoiceNo) q.set('invoiceNo', String(params.invoiceNo));
    if (params.search) q.set('search', params.search);
    if (params.status) q.set('status', params.status);
    if (params.commodityType) q.set('commodityType', params.commodityType);
    if (params.minWeight != null) q.set('minWeight', String(params.minWeight));
    if (params.maxWeight != null) q.set('maxWeight', String(params.maxWeight));
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return api.get<{
      items: StockSearchItem[];
      statusCounts: Record<string, number>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(withBranch(`/inventory/search${qs ? `?${qs}` : ''}`, branchId));
  },
  stock: (invoiceNo: number, branchId: number) =>
    api.get<StockCheckResult>(withBranch(`/inventory/stock?invoiceNo=${invoiceNo}`, branchId)),
  overdue: (branchId: number) => api.get(withBranch('/inventory/overdue', branchId)),
  detail: (loanId: number, branchId: number) =>
    api.get(withBranch(`/inventory/${loanId}`, branchId)),
  qrSearch: (code: string, branchId: number) =>
    api.get<{ found: boolean; invoiceNo?: number; message?: string }>(
      withBranch(`/inventory/qr?code=${encodeURIComponent(code)}`, branchId)
    ),
  updateItemMeta: (itemId: number, branchId: number, data: object) =>
    api.patch(withBranch(`/inventory/items/${itemId}/meta`, branchId), data),
};

export const accountsApi = {
  entries: (branchId: number, params?: { fromDate?: string; toDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.fromDate) q.set('fromDate', params.fromDate);
    if (params?.toDate) q.set('toDate', params.toDate);
    const qs = q.toString();
    return api.get(withBranch(`/accounts/entries${qs ? `?${qs}` : ''}`, branchId));
  },
  summary: (date: string, branchId: number) =>
    api.get(withBranch(`/accounts/summary?date=${date}`, branchId)),
  cashPosition: (date: string, branchId: number) =>
    api.get(withBranch(`/accounts/cash-position?date=${date}`, branchId)),
  ledger: (date: string, branchId: number) =>
    api.get(withBranch(`/accounts/ledger?date=${date}`, branchId)),
  transfers: (branchId: number) => api.get(withBranch('/accounts/transfers', branchId)),
  create: (branchId: number, data: object) =>
    api.post('/accounts/entries', { ...data, branchId }),
  setOpeningBalance: (branchId: number, data: object) =>
    api.post('/accounts/opening-balance', { ...data, branchId }),
  closeDay: (branchId: number, data: object) =>
    api.post('/accounts/close-day', { ...data, branchId }),
  createTransfer: (branchId: number, data: object) =>
    api.post('/accounts/transfers', { ...data, branchId }),
  shopDeposits: (branchId: number, fromDate?: string, toDate?: string) => {
    const q = new URLSearchParams();
    if (fromDate) q.set('fromDate', fromDate);
    if (toDate) q.set('toDate', toDate);
    const qs = q.toString();
    return api.get(withBranch(`/accounts/shop-deposits${qs ? `?${qs}` : ''}`, branchId));
  },
  createShopDeposit: (branchId: number, data: object) =>
    api.post('/accounts/shop-deposits', { ...data, branchId }),
};

export const reportsApi = {
  loanRegister: (branchId: number, fromDate?: string, toDate?: string) => {
    const q = new URLSearchParams();
    if (fromDate) q.set('fromDate', fromDate);
    if (toDate) q.set('toDate', toDate);
    const qs = q.toString();
    return api.get(withBranch(`/reports/loan-register${qs ? `?${qs}` : ''}`, branchId));
  },
  overdue: (branchId: number) => api.get(withBranch('/reports/overdue', branchId)),
  dailyBook: (date: string, branchId: number) =>
    api.get(withBranch(`/reports/daily-book?date=${date}`, branchId)),
  bankDeposits: (branchId: number) =>
    api.get(withBranch('/reports/bank-deposits', branchId)),
  payAdvance: (branchId: number) => api.get(withBranch('/reports/pay-advance', branchId)),
  investmentLedger: (branchId: number) =>
    api.get(withBranch('/reports/investment-ledger', branchId)),
  collections: (branchId: number, fromDate?: string, toDate?: string) => {
    const q = new URLSearchParams();
    if (fromDate) q.set('fromDate', fromDate);
    if (toDate) q.set('toDate', toDate);
    const qs = q.toString();
    return api.get(withBranch(`/reports/collections${qs ? `?${qs}` : ''}`, branchId));
  },
  renewals: (branchId: number, fromDate?: string, toDate?: string) => {
    const q = new URLSearchParams();
    if (fromDate) q.set('fromDate', fromDate);
    if (toDate) q.set('toDate', toDate);
    const qs = q.toString();
    return api.get(withBranch(`/reports/renewals${qs ? `?${qs}` : ''}`, branchId));
  },
  interest: (branchId: number, fromDate?: string, toDate?: string) => {
    const q = new URLSearchParams();
    if (fromDate) q.set('fromDate', fromDate);
    if (toDate) q.set('toDate', toDate);
    const qs = q.toString();
    return api.get(withBranch(`/reports/interest${qs ? `?${qs}` : ''}`, branchId));
  },
  auctions: (branchId: number, fromDate?: string, toDate?: string) => {
    const q = new URLSearchParams();
    if (fromDate) q.set('fromDate', fromDate);
    if (toDate) q.set('toDate', toDate);
    const qs = q.toString();
    return api.get(withBranch(`/reports/auctions${qs ? `?${qs}` : ''}`, branchId));
  },
  monthlyProfit: (branchId: number, year?: number, month?: number) => {
    const q = new URLSearchParams();
    if (year) q.set('year', String(year));
    if (month) q.set('month', String(month));
    const qs = q.toString();
    return api.get(withBranch(`/reports/monthly-profit${qs ? `?${qs}` : ''}`, branchId));
  },
  customerGrowth: (branchId: number, fromDate?: string, toDate?: string) => {
    const q = new URLSearchParams();
    if (fromDate) q.set('fromDate', fromDate);
    if (toDate) q.set('toDate', toDate);
    const qs = q.toString();
    return api.get(withBranch(`/reports/customer-growth${qs ? `?${qs}` : ''}`, branchId));
  },
};

export const auctionsApi = {
  list: (branchId: number) => api.get(withBranch('/auctions', branchId)),
  eligibleLoans: (branchId: number) => api.get(withBranch('/auctions/eligible-loans', branchId)),
  create: (branchId: number, data: object) =>
    api.post('/auctions', { ...data, branchId }),
  update: (id: number, branchId: number, data: object) =>
    api.patch(withBranch(`/auctions/${id}`, branchId), data),
  settlement: (id: number, branchId: number) =>
    api.get(withBranch(`/auctions/${id}/settlement`, branchId)),
  recordSale: (id: number, branchId: number, data: object) =>
    api.post(withBranch(`/auctions/${id}/sale`, branchId), data),
  complete: (id: number, branchId: number) =>
    api.post(withBranch(`/auctions/${id}/complete`, branchId), {}),
  markRefundPaid: (id: number, branchId: number) =>
    api.post(withBranch(`/auctions/${id}/refund-paid`, branchId), {}),
};

export const investmentsApi = {
  list: (branchId: number) => api.get(withBranch('/investments', branchId)),
  summary: (branchId: number) => api.get(withBranch('/investments/summary', branchId)),
  create: (branchId: number, data: object) => api.post('/investments', { ...data, branchId }),
  withdraw: (id: number) => api.post(`/investments/${id}/withdraw`, {}),
  ledger: (id: number) => api.get(`/investments/${id}/ledger`),
  profitShare: (id: number, data: object) => api.post(`/investments/${id}/profit-share`, data),
};

export const glApi = {
  accounts: (branchId: number) => api.get(withBranch('/gl/accounts', branchId)),
  journal: (branchId: number, fromDate?: string, toDate?: string) => {
    const q = new URLSearchParams();
    if (fromDate) q.set('fromDate', fromDate);
    if (toDate) q.set('toDate', toDate);
    const qs = q.toString();
    return api.get(withBranch(`/gl/journal${qs ? `?${qs}` : ''}`, branchId));
  },
  trialBalance: (branchId: number, asOf?: string) =>
    api.get(withBranch(`/gl/trial-balance${asOf ? `?asOf=${asOf}` : ''}`, branchId)),
  subLedger: (branchId: number, accountCode: string, fromDate?: string, toDate?: string) => {
    const q = new URLSearchParams({ accountCode });
    if (fromDate) q.set('fromDate', fromDate);
    if (toDate) q.set('toDate', toDate);
    return api.get(withBranch(`/gl/sub-ledger?${q}`, branchId));
  },
  createJournal: (branchId: number, data: object) =>
    api.post('/gl/journal', { ...data, branchId }),
};

export const payAdvancesApi = {
  list: (branchId: number) => api.get(withBranch('/pay-advances', branchId)),
  create: (branchId: number, data: object) => api.post('/pay-advances', { ...data, branchId }),
  settle: (id: number, settleAmount: number) =>
    api.post(`/pay-advances/${id}/settle`, { settleAmount }),
  recoveries: (id: number) => api.get(`/pay-advances/${id}/recoveries`),
};
