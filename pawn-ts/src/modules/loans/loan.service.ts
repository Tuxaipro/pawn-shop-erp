import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import {
  calculateInterestAmount,
  commodityFromId,
  commodityToId,
  getInterestRate,
  type CommodityCode,
  type CustomerTypeCode,
} from '../../lib/interest.js';
import { computeRenewalDate, formatDateOnly, parseDateOnly } from '../../lib/loan-dates.js';
import { assertSecurityPin } from '../../lib/security.js';
import { assertLoanInBranch } from '../../lib/branch.js';
import { AppError } from '../../shared/errors.js';
import {
  COMMODITY_LABELS,
  SETTLEMENT_LABELS,
  conditionFromCode,
  conditionToCode,
  customerTypeFromCode,
  customerTypeToCode,
} from './loan.constants.js';
import { getOrganizationSettings } from '../settings/organization.service.js';
import type { CreateLoanInput, LoanItemInput, UpdateLoanInput } from './loan.schema.js';
import { SILVER_PURITY_ID } from './loan.schema.js';

function normalizeItemPurity(purityId: number, commodityType: CommodityCode) {
  return commodityType === 'silver' ? SILVER_PURITY_ID : purityId;
}

function dec(v: Prisma.Decimal | number | bigint): number {
  return Number(v);
}

async function buildLoanHistory(oldLoanIdCsv: string, branchId: number) {
  const ids = oldLoanIdCsv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return [];

  const loans = await prisma.loan.findMany({
    where: { id: { in: ids.map((id) => BigInt(id)) } },
    include: { topUpDetails: { take: 1, orderBy: { createdAt: 'desc' } } },
  });

  const byId = new Map(loans.map((l) => [String(l.id), l]));
  const history: Array<{
    loanId: number;
    paidAmount: number;
    topUpAmount: number;
    settledDate: string | null;
  }> = [];

  for (const idStr of ids) {
    const prior = byId.get(idStr);
    if (!prior || prior.branchId !== branchId) continue;
    const topUp = prior.topUpDetails[0];
    if (!topUp) continue;
    history.push({
      loanId: Number(prior.id),
      paidAmount: dec(topUp.closeAmt),
      topUpAmount: dec(topUp.topupAmt),
      settledDate: prior.loanSettledDate ? formatDateOnly(prior.loanSettledDate) : null,
    });
  }

  return history;
}

function sumNetWeight(items: LoanItemInput[], commodityType: CommodityCode) {
  const total = items.reduce((s, i) => s + i.netWeight, 0);
  return commodityType === 'gold'
    ? { netWeightGold: total, netWeightSilver: 0 }
    : { netWeightGold: 0, netWeightSilver: total };
}

async function assertCustomerExists(customerId: number) {
  const c = await prisma.customer.findFirst({
    where: { id: BigInt(customerId), isDeleted: false },
  });
  if (!c) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  return c;
}

async function assertInvoiceAvailable(
  invoiceNo: number,
  branchId: number,
  excludeLoanId?: bigint
) {
  const existing = await prisma.loan.findFirst({
    where: {
      branchId,
      invoiceNo: BigInt(invoiceNo),
      ...(excludeLoanId ? { id: { not: excludeLoanId } } : {}),
    },
  });
  return !existing;
}

async function validateItems(items: LoanItemInput[], commodityTypeId: number) {
  for (const item of items) {
    const sub = await prisma.commoditySubCategory.findFirst({
      where: {
        id: item.subCategoryId,
        commodityTypeId,
        isDeleted: false,
        status: true,
      },
    });
    if (!sub) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Invalid sub-category', {
        subCategoryId: item.subCategoryId,
      });
    }
    const subItem = await prisma.commoditySubItem.findFirst({
      where: {
        id: BigInt(item.itemId),
        subCategoryId: item.subCategoryId,
        commodityTypeId,
        isDeleted: false,
        status: true,
      },
    });
    if (!subItem) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Invalid item', { itemId: item.itemId });
    }
  }
}

function serializeLoanItem(row: {
  id: bigint;
  subCategoryId: number;
  itemId: bigint;
  purityId: number;
  noOfItems: number;
  netWeight: Prisma.Decimal;
  subCategory: { nameEn: string };
  item: { nameEn: string };
  purity: { nameTamil: string; nameEng: string };
}) {
  return {
    id: Number(row.id),
    subCategoryId: row.subCategoryId,
    subCategoryName: row.subCategory.nameEn,
    itemId: Number(row.itemId),
    itemName: row.item.nameEn,
    purityId: row.purityId,
    purityName: row.purity.nameTamil,
    noOfItems: row.noOfItems,
    netWeight: dec(row.netWeight),
  };
}

function serializeCustomer(c: {
  id: bigint;
  customerId: bigint;
  name: string;
  fatherHusbandName: string;
  address1: string;
  mobileNo: string;
}) {
  return {
    id: Number(c.id),
    customerId: Number(c.customerId),
    name: c.name,
    fatherHusbandName: c.fatherHusbandName,
    address1: c.address1,
    mobileNo: c.mobileNo,
  };
}

export async function listLoans(params: {
  branchId: number;
  settlementStatus: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
  fatherHusbandName?: string;
  invoiceNo?: number;
  page: number;
  limit: number;
}) {
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 100);

  const fromDate = params.fromDate ? parseDateOnly(params.fromDate) : defaultFrom;
  const toDate = params.toDate ? parseDateOnly(params.toDate) : today;

  const where: Prisma.LoanWhereInput = {
    branchId: params.branchId,
    ...(params.invoiceNo
      ? { invoiceNo: BigInt(params.invoiceNo) }
      : { loanDate: { gte: fromDate, lte: toDate } }),
  };

  if (params.settlementStatus !== 2) {
    where.isSettled = params.settlementStatus;
  }

  if (params.search || params.fatherHusbandName) {
    where.customer = {
      isDeleted: false,
      ...(params.search
        ? { name: { contains: params.search, mode: 'insensitive' } }
        : {}),
      ...(params.fatherHusbandName
        ? { fatherHusbandName: { contains: params.fatherHusbandName, mode: 'insensitive' } }
        : {}),
    };
  }

  const [rows, total] = await Promise.all([
    prisma.loan.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            customerId: true,
            name: true,
            fatherHusbandName: true,
            address1: true,
            mobileNo: true,
          },
        },
        bankDeposits: { where: { isBankSettled: false }, take: 1 },
      },
      orderBy: { loanDate: 'desc' },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.loan.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: Number(r.id),
      invoiceNo: Number(r.invoiceNo),
      customer: serializeCustomer(r.customer),
      loanDate: formatDateOnly(r.loanDate),
      renewalDate: formatDateOnly(r.renewalDate),
      loanAmount: dec(r.loanAmount),
      interest: dec(r.interest),
      commodityType: r.commodityTypeId,
      commodityTypeLabel: COMMODITY_LABELS[r.commodityTypeId] ?? '',
      netWeightGold: dec(r.netWeightGold),
      netWeightSilver: dec(r.netWeightSilver),
      settlementStatus: r.isSettled,
      settlementStatusLabel: SETTLEMENT_LABELS[r.isSettled] ?? 'unknown',
      defaultStatus: r.defaultStatus,
      bankDepositStatus: r.bankDeposits.length > 0 ? 'open' : null,
      permissions: {
        canEdit: r.isSettled === 0 && r.bankDeposits.length === 0,
        canRenew: r.isSettled === 0 && r.bankDeposits.length === 0,
        canClose: r.isSettled === 0 && r.bankDeposits.length === 0,
        canPartialPay: r.isSettled === 0,
        canBankLoan: r.isSettled === 0 && r.bankDeposits.length === 0,
      },
    })),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

export async function getLoanById(id: number, branchId: number) {
  const row = await prisma.loan.findUnique({
    where: { id: BigInt(id) },
    include: {
      customer: true,
      items: {
        include: {
          subCategory: true,
          item: true,
          purity: true,
        },
      },
      partPayments: { orderBy: { payDate: 'asc' } },
      bankDeposits: true,
      topUpDetails: { take: 1, orderBy: { createdAt: 'desc' } },
      branch: true,
    },
  });

  if (!row) throw new AppError(404, 'LOAN_NOT_FOUND', 'Loan not found');
  assertLoanInBranch(row.branchId, branchId);

  const partPaymentTotal = row.partPayments.reduce((s, p) => s + dec(p.amount), 0);
  let interestCalculation = null;
  if (row.isSettled === 0) {
    const calc = calculateInterestAmount(
      dec(row.loanAmount),
      dec(row.interest),
      row.loanDate,
      partPaymentTotal
    );
    if (calc.status === 1) {
      interestCalculation = {
        status: calc.status,
        loanAmount: calc.loanAmount,
        interestAmount: calc.interestAmount,
        totalPayable: calc.totalPayable,
        netPayable: calc.netPayable,
        totalMonths: calc.totalMonths,
        partPaymentTotal: calc.partPaymentTotal,
        dateBreakdown: calc.dateBreakdown,
      };
    }
  }

  const topUp = row.topUpDetails[0];
  const settlementBreakdown =
    row.isSettled !== 0 && topUp
      ? {
          interestAmount: dec(topUp.interestAmt),
          totalMonths: dec(topUp.totMonth),
          totalPayable: dec(topUp.totPayAmt) + dec(topUp.interestDisAmt),
          discount: dec(topUp.interestDisAmt),
          netPayable: dec(topUp.totPayAmt),
          topUpAmount: dec(topUp.topupAmt),
        }
      : null;

  const loanHistory =
    row.isSettled !== 2 && row.oldLoanId.trim()
      ? await buildLoanHistory(row.oldLoanId, branchId)
      : [];

  const organization = await getOrganizationSettings();
  const openBankDeposits = row.bankDeposits.filter((b) => !b.isBankSettled);

  return {
    id: Number(row.id),
    invoiceNo: Number(row.invoiceNo),
    loanDate: formatDateOnly(row.loanDate),
    renewalDate: formatDateOnly(row.renewalDate),
    loanCondition: row.loanCondition,
    loanConditionLabel: conditionToCode(row.loanCondition) === 'personal' ? 'Personal' : 'General',
    loanConditionDeadlineMonth: row.loanConditionDeadlineMonth,
    conditionTimeType: row.conditionTimeType,
    loanCustomerType: row.loanCustomerType,
    loanCustomerTypeLabel: customerTypeToCode(row.loanCustomerType) === 'other' ? 'Other shop' : 'General',
    commodityType: row.commodityTypeId,
    commodityTypeLabel: COMMODITY_LABELS[row.commodityTypeId] ?? '',
    commodityTypeCode: commodityFromId(row.commodityTypeId),
    loanAmount: dec(row.loanAmount),
    loanAmountWords: row.loanAmountWords,
    interest: dec(row.interest),
    netWeightGold: dec(row.netWeightGold),
    netWeightSilver: dec(row.netWeightSilver),
    deadLineMonth: row.deadLineMonth,
    settlementStatus: row.isSettled,
    settlementStatusLabel: SETTLEMENT_LABELS[row.isSettled] ?? 'unknown',
    isBillSettled: row.isBillSettled,
    settledAmount: dec(row.settledAmount),
    loanSettledDate: row.loanSettledDate ? formatDateOnly(row.loanSettledDate) : null,
    oldLoanId: row.oldLoanId,
    defaultStatus: row.defaultStatus,
    customer: serializeCustomer(row.customer),
    organization,
    branch: {
      id: row.branch.id,
      code: row.branch.code,
      name: row.branch.name,
      address: row.branch.address,
      landline: row.branch.landline,
      phone: row.branch.phone,
      whatsapp: row.branch.whatsapp,
    },
    items: row.items.map(serializeLoanItem),
    interestCalculation,
    settlementBreakdown,
    loanHistory,
    partPayments: row.partPayments.map((p) => ({
      id: Number(p.id),
      amount: dec(p.amount),
      payDate: formatDateOnly(p.payDate),
    })),
    bankDeposits: row.bankDeposits.map((b) => ({
      id: Number(b.id),
      bankName: b.bankName,
      depositAmount: dec(b.depositAmount),
      depositDate: b.depositDate ? formatDateOnly(b.depositDate) : null,
      closingDate: b.closingDate ? formatDateOnly(b.closingDate) : null,
      isBankSettled: b.isBankSettled,
    })),
    permissions: {
      canEdit: row.isSettled === 0 && openBankDeposits.length === 0,
      canRenew: row.isSettled === 0 && openBankDeposits.length === 0,
      canClose: row.isSettled === 0 && openBankDeposits.length === 0,
      canPartialPay: row.isSettled === 0,
      canBankLoan: row.isSettled === 0 && openBankDeposits.length === 0,
    },
    createdOn: row.createdOn.toISOString(),
    updatedOn: row.updatedOn.toISOString(),
  };
}

export async function checkInvoice(invoiceNo: number, branchId: number, excludeLoanId?: number) {
  const available = await assertInvoiceAvailable(
    invoiceNo,
    branchId,
    excludeLoanId ? BigInt(excludeLoanId) : undefined
  );
  return {
    invoiceNo,
    available,
    ...(available ? {} : { message: 'Receipt number already exists' }),
  };
}

export async function calculateInterest(
  loanAmount: number,
  commodityType: CommodityCode,
  loanCustomerType: CustomerTypeCode,
  branchId: number
) {
  const result = await getInterestRate(loanAmount, commodityType, loanCustomerType, branchId);
  return {
    loanAmount,
    interestRate: result.interestRate,
    commodityType,
    loanCustomerType,
    slab: result.slab,
  };
}

export async function createLoan(input: CreateLoanInput, branchId: number, userId = 1) {
  await assertCustomerExists(input.customerId);

  const available = await assertInvoiceAvailable(input.invoiceNo, branchId);
  if (!available) {
    throw new AppError(409, 'DUPLICATE_INVOICE', 'Receipt number already exists');
  }

  const loanDate = parseDateOnly(input.loanDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (loanDate > today) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Loan date cannot be in the future');
  }

  const commodityTypeId = commodityToId(input.commodityType);
  await validateItems(input.items, commodityTypeId);

  const { interestRate } = await getInterestRate(
    input.loanAmount,
    input.commodityType,
    input.loanCustomerType,
    branchId
  );

  const { renewalDate, deadLineMonth } = computeRenewalDate(
    loanDate,
    input.loanCondition,
    input.loanConditionDeadlineMonth ?? undefined,
    (input.conditionTimeType ?? undefined) as 1 | 2 | 3 | 4 | undefined
  );

  const weights = sumNetWeight(input.items, input.commodityType);

  const loan = await prisma.$transaction(async (tx) => {
    const created = await tx.loan.create({
      data: {
        customerId: BigInt(input.customerId),
        invoiceNo: BigInt(input.invoiceNo),
        loanDate,
        loanCondition: conditionFromCode(input.loanCondition),
        loanConditionDeadlineMonth: input.loanConditionDeadlineMonth ?? 0,
        conditionTimeType: input.conditionTimeType ?? 0,
        loanCustomerType: customerTypeFromCode(input.loanCustomerType),
        commodityTypeId,
        ...weights,
        loanAmount: input.loanAmount,
        loanAmountWords: input.loanAmountWords,
        interest: interestRate,
        deadLineMonth,
        renewalDate,
        branchId,
        createdBy: BigInt(userId),
        updatedBy: BigInt(userId),
        items: {
          create: input.items.map((item) => ({
            itemId: BigInt(item.itemId),
            subCategoryId: item.subCategoryId,
            purityId: normalizeItemPurity(item.purityId, input.commodityType),
            noOfItems: item.noOfItems,
            netWeight: item.netWeight,
          })),
        },
      },
    });
    return created;
  });

  return {
    id: Number(loan.id),
    invoiceNo: Number(loan.invoiceNo),
    interest: dec(loan.interest),
    renewalDate: formatDateOnly(loan.renewalDate),
    netWeightGold: dec(loan.netWeightGold),
    netWeightSilver: dec(loan.netWeightSilver),
    settlementStatus: loan.isSettled,
  };
}

export async function updateLoan(id: number, input: UpdateLoanInput, branchId: number, userId = 1) {
  assertSecurityPin(input.securityPin);

  const existing = await prisma.loan.findUnique({ where: { id: BigInt(id) } });
  if (!existing) throw new AppError(404, 'LOAN_NOT_FOUND', 'Loan not found');
  assertLoanInBranch(existing.branchId, branchId);
  if (existing.isSettled !== 0) {
    throw new AppError(409, 'LOAN_NOT_EDITABLE', 'Only open loans can be edited');
  }

  const available = await assertInvoiceAvailable(input.invoiceNo, branchId, existing.id);
  if (!available) {
    throw new AppError(409, 'DUPLICATE_INVOICE', 'Receipt number already exists');
  }

  const commodityTypeId = commodityToId(input.commodityType);
  await validateItems(input.items, commodityTypeId);
  const weights = sumNetWeight(input.items, input.commodityType);

  const loan = await prisma.$transaction(async (tx) => {
    await tx.loanItem.deleteMany({ where: { loanId: existing.id } });
    return tx.loan.update({
      where: { id: existing.id },
      data: {
        invoiceNo: BigInt(input.invoiceNo),
        loanCondition: conditionFromCode(input.loanCondition),
        loanConditionDeadlineMonth: input.loanConditionDeadlineMonth ?? 0,
        conditionTimeType: input.conditionTimeType ?? 0,
        loanCustomerType: customerTypeFromCode(input.loanCustomerType),
        commodityTypeId,
        ...weights,
        loanAmount: input.loanAmount,
        loanAmountWords: input.loanAmountWords,
        interest: input.interest,
        updatedBy: BigInt(userId),
        items: {
          create: input.items.map((item) => ({
            itemId: BigInt(item.itemId),
            subCategoryId: item.subCategoryId,
            purityId: normalizeItemPurity(item.purityId, input.commodityType),
            noOfItems: item.noOfItems,
            netWeight: item.netWeight,
          })),
        },
      },
    });
  });

  return {
    id: Number(loan.id),
    invoiceNo: Number(loan.invoiceNo),
    loanAmount: dec(loan.loanAmount),
    netWeightGold: dec(loan.netWeightGold),
    netWeightSilver: dec(loan.netWeightSilver),
    updatedOn: loan.updatedOn.toISOString(),
  };
}

export async function deleteLoan(id: number, securityPin: string, branchId: number, userId = 1) {
  assertSecurityPin(securityPin);

  const existing = await prisma.loan.findUnique({ where: { id: BigInt(id) } });
  if (!existing) throw new AppError(404, 'LOAN_NOT_FOUND', 'Loan not found');
  assertLoanInBranch(existing.branchId, branchId);
  if (existing.isSettled !== 0) {
    throw new AppError(409, 'LOAN_NOT_EDITABLE', 'Only open loans can be voided');
  }

  await prisma.$transaction(async (tx) => {
    await tx.loanItem.deleteMany({ where: { loanId: existing.id } });
    await tx.loan.delete({ where: { id: existing.id } });
  });

  return {
    id: Number(existing.id),
    invoiceNo: Number(existing.invoiceNo),
    voidedAt: new Date().toISOString(),
  };
}
