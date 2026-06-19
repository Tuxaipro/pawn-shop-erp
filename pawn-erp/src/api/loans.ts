import { api, withBranch } from './client';

export type CommodityType = 'gold' | 'silver';
export type LoanCondition = 'general' | 'personal';
export type LoanCustomerType = 'general' | 'other';

export interface LoanItemInput {
  subCategoryId: number;
  itemId: number;
  purityId: number;
  noOfItems: number;
  netWeight: number;
}

export interface LoanFormData {
  customerId: number;
  invoiceNo: number;
  loanDate: string;
  commodityType: CommodityType;
  loanCondition: LoanCondition;
  loanConditionDeadlineMonth?: number;
  conditionTimeType?: number;
  loanCustomerType: LoanCustomerType;
  loanAmount: number;
  loanAmountWords: string;
  items: LoanItemInput[];
}

export interface LoanListItem {
  id: number;
  invoiceNo: number;
  customer: { id: number; customerId: number; name: string; fatherHusbandName: string };
  loanDate: string;
  renewalDate: string;
  loanAmount: number;
  interest: number;
  commodityType: number;
  commodityTypeLabel: string;
  netWeightGold: number;
  netWeightSilver: number;
  settlementStatus: number;
  settlementStatusLabel: string;
  bankDepositStatus?: string | null;
  permissions?: {
    canEdit: boolean;
    canRenew: boolean;
    canClose: boolean;
    canPartialPay: boolean;
    canBankLoan: boolean;
  };
}

export interface LoanDetail extends LoanListItem {
  loanCondition: number;
  loanConditionLabel: string;
  loanConditionDeadlineMonth: number;
  conditionTimeType: number;
  loanCustomerType: number;
  loanCustomerTypeLabel: string;
  loanAmountWords: string;
  commodityTypeCode: CommodityType;
  deadLineMonth: number;
  isBillSettled: number;
  settledAmount: number;
  loanSettledDate: string | null;
  partPayments: Array<{ id: number; amount: number; payDate: string }>;
  items: Array<{
    id: number;
    subCategoryId: number;
    subCategoryName: string;
    itemId: number;
    itemName: string;
    purityId: number;
    purityName: string;
    noOfItems: number;
    netWeight: number;
  }>;
  interestCalculation: {
    interestAmount: number;
    totalPayable: number;
    netPayable: number;
    partPaymentTotal: number;
    totalMonths: number;
    dateBreakdown: string;
  } | null;
  settlementBreakdown: {
    interestAmount: number;
    totalMonths: number;
    totalPayable: number;
    discount: number;
    netPayable: number;
    topUpAmount: number;
  } | null;
  loanHistory: Array<{
    loanId: number;
    paidAmount: number;
    topUpAmount: number;
    settledDate: string | null;
  }>;
  oldLoanId: string;
  organization: {
    companyName: string;
    proprietor: string;
  };
  branch: {
    id: number;
    code: string;
    name: string;
    address: string;
    landline: string;
    phone: string;
    whatsapp: string;
  };
  customer: {
    id: number;
    customerId: number;
    name: string;
    fatherHusbandName: string;
    address1: string;
    mobileNo: string;
  };
  bankDeposits?: Array<{
    id: number;
    bankName: string;
    depositAmount: number;
    depositDate: string | null;
    closingDate: string | null;
    isBankSettled: boolean;
  }>;
}

export interface FormOptions {
  commodityTypes: Array<{ id: number; name: string; nameEn: string; nameTa?: string; code: CommodityType }>;
  loanConditions: Array<{ id: number; nameEn: string; nameTn: string }>;
  customerTypes: Array<{ id: number; nameTn: string; code: LoanCustomerType }>;
  conditionTimeTypes: Array<{ id: number; code: string; label: string }>;
  purities: Array<{ id: number; nameTn: string; nameEn: string }>;
  subCategories: Array<{ id: number; name: string; nameEn: string; nameTa?: string; commodityTypeId: number }>;
  defaultLoanDate: string;
  maxLoanDate: string;
}

export interface ReloanContext {
  hasHistory: boolean;
  suggestedLoanAmount: number | null;
  renewalCount: number;
  previousLoan: {
    commodityType: CommodityType;
    loanCondition: LoanCondition;
    loanCustomerType: LoanCustomerType;
    interest: number;
  } | null;
  prefillItems: Array<{
    subCategoryId: number;
    itemId: number;
    purityId: number;
    noOfItems: number;
    netWeight: number;
  }>;
}

export const loansApi = {
  reloanContext: (customerId: number, branchId: number) =>
    api.get<ReloanContext>(withBranch(`/loans/reloan/${customerId}`, branchId)),
  list: (branchId: number, params: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') q.set(k, String(v));
    });
    const qs = q.toString();
    return api.get<{ items: LoanListItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      withBranch(`/loans${qs ? `?${qs}` : ''}`, branchId)
    );
  },
  get: (id: number, branchId: number) => api.get<LoanDetail>(withBranch(`/loans/${id}`, branchId)),
  formOptions: (commodityType?: CommodityType) =>
    api.get<FormOptions>(`/loans/form-options${commodityType ? `?commodityType=${commodityType}` : ''}`),
  calculateInterest: (
    branchId: number,
    params: { loanAmount: number; commodityType: CommodityType; loanCustomerType: LoanCustomerType }
  ) => {
    const q = new URLSearchParams({
      loanAmount: String(params.loanAmount),
      commodityType: params.commodityType,
      loanCustomerType: params.loanCustomerType,
    });
    return api.get<{ interestRate: number }>(
      withBranch(`/loans/calculate-interest?${q}`, branchId)
    );
  },
  checkInvoice: (invoiceNo: number, branchId: number, excludeLoanId?: number) => {
    const q = excludeLoanId ? `?excludeLoanId=${excludeLoanId}` : '';
    return api.get<{ available: boolean; message?: string }>(
      withBranch(`/loans/check-invoice/${invoiceNo}${q}`, branchId)
    );
  },
  create: (branchId: number, data: LoanFormData) =>
    api.post<{ id: number; invoiceNo: number; interest: number; renewalDate: string }>(`/loans`, {
      ...data,
      branchId,
    }),
  update: (id: number, branchId: number, data: LoanFormData & { securityPin: string; interest: number }) =>
    api.put(`/loans/${id}`, { ...data, branchId }),
  delete: (id: number, branchId: number, securityPin: string) =>
    api.delete(withBranch(`/loans/${id}`, branchId), { securityPin }),
  subItems: (subCategoryId: number, commodityType: CommodityType) =>
    api.get<Array<{ id: number; name: string; nameEn: string; nameTa?: string }>>(
      `/commodities/sub-items?subCategoryId=${subCategoryId}&commodityType=${commodityType}`
    ),
};
