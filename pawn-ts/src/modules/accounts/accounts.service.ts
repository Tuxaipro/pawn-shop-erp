import { prisma } from '../../lib/prisma.js';
import { dec } from '../../lib/loan-helper.js';
import { parseDateOnly, formatDateOnly } from '../../lib/loan-dates.js';
import { AppError } from '../../shared/errors.js';
import type { Prisma } from '@prisma/client';

function dayRange(date: string) {
  const start = parseDateOnly(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function settlementCashAmount(loan: {
  settledAmount: Prisma.Decimal;
  topUpDetails: Array<{ totPayAmt: Prisma.Decimal }>;
}) {
  const topUp = loan.topUpDetails[0];
  return topUp ? dec(topUp.totPayAmt) : dec(loan.settledAmount);
}

async function settledLoansInRange(branchId: number, start: Date, end: Date) {
  return prisma.loan.findMany({
    where: {
      branchId,
      isSettled: { in: [1, 2] },
      loanSettledDate: { gte: start, lt: end },
    },
    include: {
      customer: { select: { name: true } },
      topUpDetails: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { loanSettledDate: 'asc' },
  });
}

async function ensureDailyBalanceRow(branchId: number, balanceDate: Date) {
  let row = await prisma.dailyCashBalance.findUnique({
    where: { branchId_balanceDate: { branchId, balanceDate } },
  });
  if (!row) {
    const prevDate = new Date(balanceDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prev = await prisma.dailyCashBalance.findUnique({
      where: { branchId_balanceDate: { branchId, balanceDate: prevDate } },
    });
    const opening = prev?.closingBalance ? dec(prev.closingBalance) : 0;
    row = await prisma.dailyCashBalance.create({
      data: {
        branchId,
        balanceDate,
        openingBalance: opening,
        vaultCash: prev ? dec(prev.vaultCash) : 0,
        counterCash: prev ? dec(prev.counterCash) : 0,
      },
    });
  }
  return row;
}

function entryCategoryLabel(category: number) {
  if (category === 1) return 'Income';
  if (category === 2) return 'Expense';
  return 'Petty cash';
}

function ledgerTypeForCategory(category: number) {
  if (category === 1) return 'income';
  if (category === 2) return 'expense';
  return 'petty_cash';
}

export async function listEntries(params: {
  fromDate?: string;
  toDate?: string;
  category?: number;
  branchId?: number;
  page: number;
  limit: number;
}) {
  const where: {
    entryDate?: { gte?: Date; lte?: Date };
    category?: number;
    branchId?: number;
  } = {};

  if (params.fromDate || params.toDate) {
    where.entryDate = {};
    if (params.fromDate) where.entryDate.gte = parseDateOnly(params.fromDate);
    if (params.toDate) where.entryDate.lte = parseDateOnly(params.toDate);
  }
  if (params.category) where.category = params.category;
  if (params.branchId) where.branchId = params.branchId;

  const [rows, total] = await Promise.all([
    prisma.incomeExpense.findMany({
      where,
      orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.incomeExpense.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      userName: r.userName,
      description: r.description,
      category: r.category,
      categoryLabel: entryCategoryLabel(r.category),
      amount: dec(r.amount),
      entryDate: formatDateOnly(r.entryDate),
      createdOn: r.createdOn.toISOString(),
      branchId: r.branchId,
    })),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

export async function createEntry(
  input: {
    userName: string;
    description: string;
    category: number;
    amount: number;
    entryDate: string;
    branchId?: number;
  },
  userId = 1
) {
  const entryDate = parseDateOnly(input.entryDate);
  const branchId = input.branchId!;
  const balanceRow = await ensureDailyBalanceRow(branchId, entryDate);
  if (balanceRow.isClosed) {
    throw new AppError(409, 'DAY_CLOSED', 'Cannot modify a closed day');
  }

  const row = await prisma.incomeExpense.create({
    data: {
      userName: input.userName,
      description: input.description,
      category: input.category,
      amount: input.amount,
      entryDate,
      branchId: input.branchId!,
      createdBy: BigInt(userId),
    },
  });

  return {
    id: row.id,
    amount: dec(row.amount),
    entryDate: formatDateOnly(row.entryDate),
    category: row.category,
  };
}

export async function getDailySummary(date: string, branchId = 1) {
  const entryDate = parseDateOnly(date);
  const rows = await prisma.incomeExpense.findMany({
    where: { entryDate, branchId },
  });

  let income = 0;
  let expense = 0;
  let pettyCash = 0;
  for (const r of rows) {
    const amt = dec(r.amount);
    if (r.category === 1) income += amt;
    else if (r.category === 2) expense += amt;
    else pettyCash += amt;
  }

  return {
    date,
    branchId,
    income,
    expense,
    pettyCash,
    net: income - expense - pettyCash,
    entryCount: rows.length,
  };
}

async function getDayTransactions(date: string, branchId: number) {
  const { start, end } = dayRange(date);

  const [partPayments, settledLoans, newLoans, transfersIn, transfersOut] = await Promise.all([
    prisma.loanPartPayment.aggregate({
      where: { payDate: { gte: start, lt: end }, loan: { branchId } },
      _sum: { amount: true },
    }),
    settledLoansInRange(branchId, start, end),
    prisma.loan.aggregate({
      where: { branchId, loanDate: { gte: start, lt: end } },
      _sum: { loanAmount: true },
      _count: true,
    }),
    prisma.cashTransfer.aggregate({
      where: { toBranchId: branchId, transferDate: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.cashTransfer.aggregate({
      where: { fromBranchId: branchId, transferDate: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
  ]);

  const partPaymentTotal = dec(partPayments._sum.amount ?? 0);
  let loanSettlements = 0;
  for (const loan of settledLoans) {
    loanSettlements += settlementCashAmount(loan);
  }

  return {
    collections: partPaymentTotal + loanSettlements,
    partPayments: partPaymentTotal,
    loanSettlements,
    loanSettlementCount: settledLoans.length,
    disbursements: dec(newLoans._sum.loanAmount ?? 0),
    newLoanCount: newLoans._count,
    transfersIn: dec(transfersIn._sum.amount ?? 0),
    transfersOut: dec(transfersOut._sum.amount ?? 0),
  };
}

export async function getDailyBalance(date: string, branchId: number) {
  const balanceDate = parseDateOnly(date);
  const row = await ensureDailyBalanceRow(branchId, balanceDate);

  const summary = await getDailySummary(date, branchId);
  const txns = await getDayTransactions(date, branchId);
  const opening = dec(row.openingBalance);
  const cashInHand =
    opening +
    summary.income +
    txns.collections +
    txns.transfersIn -
    summary.expense -
    summary.pettyCash -
    txns.disbursements -
    txns.transfersOut;

  const { date: _d, branchId: _b, ...summaryRest } = summary;

  return {
    date,
    branchId,
    openingBalance: opening,
    closingBalance: row.closingBalance ? dec(row.closingBalance) : null,
    vaultCash: dec(row.vaultCash),
    counterCash: dec(row.counterCash),
    physicalCount: row.physicalCount ? dec(row.physicalCount) : null,
    isClosed: row.isClosed,
    cashInHand,
    ...summaryRest,
    ...txns,
    variance:
      row.physicalCount && row.closingBalance
        ? dec(row.physicalCount) - dec(row.closingBalance)
        : null,
  };
}

export async function setOpeningBalance(
  branchId: number,
  input: { date: string; openingBalance: number; vaultCash?: number; counterCash?: number }
) {
  const balanceDate = parseDateOnly(input.date);
  const existing = await prisma.dailyCashBalance.findUnique({
    where: { branchId_balanceDate: { branchId, balanceDate } },
  });
  if (existing?.isClosed) {
    throw new AppError(409, 'DAY_CLOSED', 'Cannot modify a closed day');
  }

  const row = await prisma.dailyCashBalance.upsert({
    where: { branchId_balanceDate: { branchId, balanceDate } },
    create: {
      branchId,
      balanceDate,
      openingBalance: input.openingBalance,
      vaultCash: input.vaultCash ?? 0,
      counterCash: input.counterCash ?? 0,
    },
    update: {
      openingBalance: input.openingBalance,
      ...(input.vaultCash !== undefined ? { vaultCash: input.vaultCash } : {}),
      ...(input.counterCash !== undefined ? { counterCash: input.counterCash } : {}),
    },
  });

  return {
    date: input.date,
    openingBalance: dec(row.openingBalance),
    vaultCash: dec(row.vaultCash),
    counterCash: dec(row.counterCash),
  };
}

export async function closeDay(
  branchId: number,
  input: {
    date: string;
    closingBalance: number;
    physicalCount?: number;
    vaultCash?: number;
    counterCash?: number;
    notes?: string;
  },
  userId?: number
) {
  const balanceDate = parseDateOnly(input.date);
  const existing = await prisma.dailyCashBalance.findUnique({
    where: { branchId_balanceDate: { branchId, balanceDate } },
  });
  if (existing?.isClosed) {
    throw new AppError(409, 'DAY_CLOSED', 'Day already closed');
  }

  const row = await prisma.dailyCashBalance.upsert({
    where: { branchId_balanceDate: { branchId, balanceDate } },
    create: {
      branchId,
      balanceDate,
      openingBalance: 0,
      closingBalance: input.closingBalance,
      physicalCount: input.physicalCount,
      vaultCash: input.vaultCash ?? 0,
      counterCash: input.counterCash ?? 0,
      isClosed: true,
      closedOn: new Date(),
      closedBy: userId,
      notes: input.notes ?? '',
    },
    update: {
      closingBalance: input.closingBalance,
      physicalCount: input.physicalCount,
      ...(input.vaultCash !== undefined ? { vaultCash: input.vaultCash } : {}),
      ...(input.counterCash !== undefined ? { counterCash: input.counterCash } : {}),
      isClosed: true,
      closedOn: new Date(),
      closedBy: userId,
      notes: input.notes ?? '',
    },
  });

  return {
    date: input.date,
    closingBalance: dec(row.closingBalance!),
    physicalCount: row.physicalCount ? dec(row.physicalCount) : null,
    isClosed: true,
    variance:
      row.physicalCount && row.closingBalance
        ? dec(row.physicalCount) - dec(row.closingBalance)
        : null,
  };
}

export async function listTransfers(branchId: number, fromDate?: string, toDate?: string) {
  const where: {
    OR: Array<{ fromBranchId: number } | { toBranchId: number }>;
    transferDate?: { gte?: Date; lte?: Date };
  } = {
    OR: [{ fromBranchId: branchId }, { toBranchId: branchId }],
  };
  if (fromDate || toDate) {
    where.transferDate = {};
    if (fromDate) where.transferDate.gte = parseDateOnly(fromDate);
    if (toDate) where.transferDate.lte = parseDateOnly(toDate);
  }

  const rows = await prisma.cashTransfer.findMany({
    where,
    include: {
      fromBranch: { select: { id: true, name: true, code: true } },
      toBranch: { select: { id: true, name: true, code: true } },
    },
    orderBy: { transferDate: 'desc' },
    take: 100,
  });

  return rows.map((r) => ({
    id: r.id,
    fromBranchId: r.fromBranchId,
    fromBranchName: r.fromBranch.name,
    toBranchId: r.toBranchId,
    toBranchName: r.toBranch.name,
    amount: dec(r.amount),
    transferDate: formatDateOnly(r.transferDate),
    description: r.description,
    direction: r.fromBranchId === branchId ? 'out' : 'in',
  }));
}

export async function createTransfer(
  fromBranchId: number,
  input: { toBranchId: number; amount: number; transferDate: string; description?: string },
  userId?: number
) {
  if (fromBranchId === input.toBranchId) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Cannot transfer to the same branch');
  }

  const row = await prisma.cashTransfer.create({
    data: {
      fromBranchId,
      toBranchId: input.toBranchId,
      amount: input.amount,
      transferDate: parseDateOnly(input.transferDate),
      description: input.description ?? '',
      createdBy: userId,
    },
    include: {
      fromBranch: { select: { name: true } },
      toBranch: { select: { name: true } },
    },
  });

  return {
    id: row.id,
    amount: dec(row.amount),
    fromBranchName: row.fromBranch.name,
    toBranchName: row.toBranch.name,
    transferDate: formatDateOnly(row.transferDate),
  };
}

function ledgerRow(input: {
  sortAt: Date;
  recordedBy?: string | null;
  type: string;
  description: string;
  amount: number;
  direction: string;
  ref: string;
}) {
  return {
    dateTime: input.sortAt.toISOString(),
    recordedBy: input.recordedBy ?? null,
    type: input.type,
    description: input.description,
    amount: input.amount,
    direction: input.direction,
    ref: input.ref,
    _sortAt: input.sortAt.getTime(),
  };
}

export async function getUnifiedLedger(date: string, branchId: number) {
  const { start, end } = dayRange(date);
  const summary = await getDailySummary(date, branchId);
  const balance = await getDailyBalance(date, branchId);

  const [entries, partPayments, settledLoans, newLoans] = await Promise.all([
    prisma.incomeExpense.findMany({
      where: { branchId, entryDate: { gte: start, lt: end } },
    }),
    prisma.loanPartPayment.findMany({
      where: { payDate: { gte: start, lt: end }, loan: { branchId } },
      include: {
        loan: {
          select: { invoiceNo: true, customer: { select: { name: true } } },
        },
      },
    }),
    settledLoansInRange(branchId, start, end),
    prisma.loan.findMany({
      where: { branchId, loanDate: { gte: start, lt: end } },
      include: { customer: { select: { name: true } } },
    }),
  ]);

  const ledger = [
    ...entries.map((e) =>
      ledgerRow({
        sortAt: e.createdOn,
        recordedBy: e.userName,
        type: ledgerTypeForCategory(e.category),
        description: e.description,
        amount: dec(e.amount),
        direction: e.category === 1 ? 'in' : 'out',
        ref: `IE-${e.id}`,
      })
    ),
    ...partPayments.map((p) =>
      ledgerRow({
        sortAt: p.createdAt,
        type: 'collection',
        description: `Part payment — ${p.loan.customer.name} (#${p.loan.invoiceNo})`,
        amount: dec(p.amount),
        direction: 'in',
        ref: `PP-${p.id}`,
      })
    ),
    ...settledLoans.map((l) =>
      ledgerRow({
        sortAt: l.updatedOn,
        type: l.isSettled === 1 ? 'loan_close' : 'loan_renewal',
        description:
          l.isSettled === 1
            ? `Loan close — ${l.customer.name} (#${l.invoiceNo})`
            : `Loan renewal settlement — ${l.customer.name} (#${l.invoiceNo})`,
        amount: settlementCashAmount(l),
        direction: 'in',
        ref: `LC-${l.id}`,
      })
    ),
    ...newLoans.map((l) =>
      ledgerRow({
        sortAt: l.createdOn,
        type: 'disbursement',
        description: `New loan — ${l.customer.name} (#${l.invoiceNo})`,
        amount: dec(l.loanAmount),
        direction: 'out',
        ref: `LN-${l.id}`,
      })
    ),
  ];

  ledger.sort((a, b) => b._sortAt - a._sortAt);

  return {
    summary,
    balance,
    ledger: ledger.map(({ _sortAt: _s, ...row }) => row),
  };
}
