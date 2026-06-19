import { prisma } from '../../lib/prisma.js';
import { dec } from '../../lib/loan-helper.js';
// dec used by payAdvanceReport and investmentLedgerReport
import { formatDateOnly, parseDateOnly } from '../../lib/loan-dates.js';
import * as accountsService from '../accounts/accounts.service.js';

export async function loanRegisterReport(params: {
  fromDate?: string;
  toDate?: string;
  settlementStatus?: number;
  branchId: number;
}) {
  const today = new Date();
  const fromDate = params.fromDate ? parseDateOnly(params.fromDate) : new Date(today.getFullYear(), today.getMonth(), 1);
  const toDate = params.toDate ? parseDateOnly(params.toDate) : today;

  const where: {
    loanDate: { gte: Date; lte: Date };
    isSettled?: number;
    branchId: number;
  } = { loanDate: { gte: fromDate, lte: toDate }, branchId: params.branchId };

  if (params.settlementStatus !== undefined && params.settlementStatus !== 2) {
    where.isSettled = params.settlementStatus;
  }

  const rows = await prisma.loan.findMany({
    where,
    include: { customer: { select: { name: true, mobileNo: true } } },
    orderBy: { loanDate: 'asc' },
  });

  const totalLoanAmount = rows.reduce((s, r) => s + dec(r.loanAmount), 0);

  return {
    fromDate: formatDateOnly(fromDate),
    toDate: formatDateOnly(toDate),
    count: rows.length,
    totalLoanAmount,
    items: rows.map((r) => ({
      id: Number(r.id),
      invoiceNo: Number(r.invoiceNo),
      loanDate: formatDateOnly(r.loanDate),
      customerName: r.customer.name,
      mobileNo: r.customer.mobileNo,
      loanAmount: dec(r.loanAmount),
      interest: dec(r.interest),
      settlementStatus: r.isSettled,
    })),
  };
}

export async function overdueReport(branchId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where = {
    isSettled: 0,
    renewalDate: { lt: today },
    branchId,
  };

  const rows = await prisma.loan.findMany({
    where,
    include: { customer: { select: { name: true, mobileNo: true, address1: true } } },
    orderBy: { renewalDate: 'asc' },
  });

  return {
    asOf: formatDateOnly(today),
    count: rows.length,
    totalOutstanding: rows.reduce((s, r) => s + dec(r.loanAmount), 0),
    items: rows.map((r) => ({
      id: Number(r.id),
      invoiceNo: Number(r.invoiceNo),
      customerName: r.customer.name,
      mobileNo: r.customer.mobileNo,
      address: r.customer.address1,
      renewalDate: formatDateOnly(r.renewalDate),
      loanAmount: dec(r.loanAmount),
      defaultStatus: r.defaultStatus,
    })),
  };
}

export async function bankDepositReport(branchId: number, isSettled?: boolean) {
  const where: { isBankSettled?: boolean; loan: { branchId: number } } = {
    loan: { branchId },
  };
  if (isSettled !== undefined) where.isBankSettled = isSettled;
  const rows = await prisma.bankDeposit.findMany({
    where,
    include: {
      loan: { select: { invoiceNo: true } },
      customer: { select: { name: true } },
    },
    orderBy: { depositDate: 'desc' },
  });

  return {
    count: rows.length,
    totalDeposit: rows.reduce((s, r) => s + dec(r.depositAmount), 0),
    items: rows.map((r) => ({
      id: Number(r.id),
      invoiceNo: Number(r.loan.invoiceNo),
      customerName: r.customer?.name,
      bankName: r.bankName,
      depositAmount: dec(r.depositAmount),
      depositDate: r.depositDate?.toISOString().slice(0, 10),
      isBankSettled: r.isBankSettled,
    })),
  };
}

export async function payAdvanceReport(branchId: number) {
  const rows = await prisma.payAdvance.findMany({
    where: { branchId, status: 'pending' },
    orderBy: { dueDate: 'asc' },
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    totalPending: rows.reduce((s, r) => s + dec(r.balance), 0),
    items: rows.map((r) => ({
      id: r.id,
      partyName: r.partyName,
      advanceType: r.advanceType,
      balance: dec(r.balance),
      dueDate: r.dueDate?.toISOString().slice(0, 10) ?? null,
      daysOverdue:
        r.dueDate && r.dueDate < today
          ? Math.floor((today.getTime() - r.dueDate.getTime()) / 86400000)
          : 0,
    })),
  };
}

export async function investmentLedgerReport(branchId: number) {
  const rows = await prisma.investment.findMany({
    where: { branchId },
    orderBy: { investmentDate: 'asc' },
  });
  return {
    totalInvested: rows.filter((r) => r.status === 'active').reduce((s, r) => s + dec(r.amount), 0),
    items: rows.map((r) => ({
      id: r.id,
      investorName: r.investorName,
      investorType: r.investorType,
      amount: dec(r.amount),
      investmentDate: r.investmentDate.toISOString().slice(0, 10),
      status: r.status,
      profitSharePct: dec(r.profitSharePct),
    })),
  };
}

export async function dailyBookReport(date: string, branchId: number) {
  return accountsService.getUnifiedLedger(date, branchId);
}

export async function collectionsReport(branchId: number, fromDate?: string, toDate?: string) {
  const today = new Date();
  const from = fromDate ? parseDateOnly(fromDate) : new Date(today.getFullYear(), today.getMonth(), 1);
  const to = toDate ? parseDateOnly(toDate) : today;

  const rows = await prisma.loanPartPayment.findMany({
    where: { payDate: { gte: from, lte: to }, loan: { branchId } },
    include: {
      loan: { select: { invoiceNo: true, customer: { select: { name: true } } } },
    },
    orderBy: { payDate: 'desc' },
  });

  const total = rows.reduce((s, r) => s + dec(r.amount), 0);
  return {
    fromDate: formatDateOnly(from),
    toDate: formatDateOnly(to),
    count: rows.length,
    total,
    items: rows.map((r) => ({
      id: Number(r.id),
      invoiceNo: Number(r.loan.invoiceNo),
      customerName: r.loan.customer.name,
      amount: dec(r.amount),
      payDate: formatDateOnly(r.payDate),
    })),
  };
}

export async function renewalsReport(branchId: number, fromDate?: string, toDate?: string) {
  const today = new Date();
  const from = fromDate ? parseDateOnly(fromDate) : new Date(today.getFullYear(), today.getMonth(), 1);
  const to = toDate ? parseDateOnly(toDate) : today;

  const rows = await prisma.loan.findMany({
    where: { branchId, isSettled: 2, loanSettledDate: { gte: from, lte: to } },
    include: { customer: { select: { name: true } } },
    orderBy: { loanSettledDate: 'desc' },
  });

  return {
    fromDate: formatDateOnly(from),
    toDate: formatDateOnly(to),
    count: rows.length,
    items: rows.map((r) => ({
      id: Number(r.id),
      invoiceNo: Number(r.invoiceNo),
      customerName: r.customer.name,
      loanAmount: dec(r.loanAmount),
      settledDate: r.loanSettledDate ? formatDateOnly(r.loanSettledDate) : null,
    })),
  };
}

export async function interestReport(branchId: number, fromDate?: string, toDate?: string) {
  const today = new Date();
  const from = fromDate ? parseDateOnly(fromDate) : new Date(today.getFullYear(), today.getMonth(), 1);
  const to = toDate ? parseDateOnly(toDate) : today;

  const rows = await prisma.loanPartPayment.findMany({
    where: { payDate: { gte: from, lte: to }, loan: { branchId } },
    include: { loan: { select: { invoiceNo: true, interest: true, customer: { select: { name: true } } } } },
    orderBy: { payDate: 'desc' },
  });

  const total = rows.reduce((s, r) => s + dec(r.amount), 0);
  return {
    fromDate: formatDateOnly(from),
    toDate: formatDateOnly(to),
    count: rows.length,
    totalCollections: total,
    items: rows.map((r) => ({
      id: Number(r.id),
      invoiceNo: Number(r.loan.invoiceNo),
      customerName: r.loan.customer.name,
      amount: dec(r.amount),
      interestRate: dec(r.loan.interest),
      payDate: formatDateOnly(r.payDate),
    })),
  };
}

export async function auctionReport(branchId: number, fromDate?: string, toDate?: string) {
  const today = new Date();
  const from = fromDate ? parseDateOnly(fromDate) : new Date(today.getFullYear(), today.getMonth(), 1);
  const to = toDate ? parseDateOnly(toDate) : today;

  const rows = await prisma.auctionNotice.findMany({
    where: {
      loan: { branchId },
      noticeDate: { gte: from, lte: to },
    },
    include: {
      loan: { select: { invoiceNo: true, customer: { select: { name: true } } } },
    },
    orderBy: { noticeDate: 'desc' },
  });

  return {
    fromDate: formatDateOnly(from),
    toDate: formatDateOnly(to),
    count: rows.length,
    totalSale: rows.reduce((s, r) => s + dec(r.saleAmount ?? 0), 0),
    totalSurplus: rows.reduce((s, r) => s + dec(r.surplusRefund ?? 0), 0),
    totalDeficit: rows.reduce((s, r) => s + dec(r.deficitAmount ?? 0), 0),
    items: rows.map((r) => ({
      id: Number(r.id),
      invoiceNo: Number(r.loan.invoiceNo),
      customerName: r.loan.customer.name,
      noticeDate: formatDateOnly(r.noticeDate),
      auctionDate: r.auctionDate ? formatDateOnly(r.auctionDate) : null,
      status: r.status,
      saleAmount: r.saleAmount ? dec(r.saleAmount) : null,
      surplusRefund: r.surplusRefund ? dec(r.surplusRefund) : null,
      deficitAmount: r.deficitAmount ? dec(r.deficitAmount) : null,
      refundStatus: r.refundStatus,
    })),
  };
}

export async function monthlyProfitReport(branchId: number, year?: number, month?: number) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0);

  const [incomeAgg, expenseAgg, collectionsAgg] = await Promise.all([
    prisma.incomeExpense.aggregate({
      where: { branchId, category: 1, entryDate: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.incomeExpense.aggregate({
      where: { branchId, category: 2, entryDate: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.loanPartPayment.aggregate({
      where: { payDate: { gte: from, lte: to }, loan: { branchId } },
      _sum: { amount: true },
    }),
  ]);

  const income = dec(incomeAgg._sum.amount ?? 0);
  const expense = dec(expenseAgg._sum.amount ?? 0);
  const collections = dec(collectionsAgg._sum.amount ?? 0);

  return {
    year: y,
    month: m + 1,
    income,
    expense,
    collections,
    profit: income - expense,
    netWithCollections: income + collections - expense,
  };
}

export async function customerGrowthReport(branchId: number, fromDate?: string, toDate?: string) {
  const today = new Date();
  const from = fromDate ? parseDateOnly(fromDate) : new Date(today.getFullYear(), today.getMonth(), 1);
  const to = toDate ? parseDateOnly(toDate) : today;

  const count = await prisma.customer.count({
    where: { isDeleted: false, createdOn: { gte: from, lte: to } },
  });

  const rows = await prisma.customer.findMany({
    where: { isDeleted: false, createdOn: { gte: from, lte: to } },
    orderBy: { createdOn: 'desc' },
    take: 100,
  });

  return {
    fromDate: formatDateOnly(from),
    toDate: formatDateOnly(to),
    newCustomers: count,
    items: rows.map((r) => ({
      id: Number(r.id),
      customerId: Number(r.customerId),
      name: r.name,
      mobileNo: r.mobileNo,
      createdOn: r.createdOn.toISOString().slice(0, 10),
    })),
  };
}
