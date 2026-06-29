import { prisma } from '../../lib/prisma.js';
import { dec } from '../../lib/loan-helper.js';
import { parseDateOnly, formatDateOnly } from '../../lib/loan-dates.js';
import { sumDenominations, type DenominationInput } from '../../lib/cash-denominations.js';
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

async function getCashLimit(): Promise<number> {
  const org = await prisma.organizationSettings.findUnique({ where: { id: 1 } });
  return org?.cashLimit ? dec(org.cashLimit) : 0;
}

function computeBookClosingBalance(
  opening: number,
  summary: { income: number; expense: number; pettyCash: number; topUp: number },
  txns: { collections: number; disbursements: number; shopBankDeposits: number }
) {
  return (
    opening +
    summary.income +
    summary.topUp +
    txns.collections -
    summary.expense -
    summary.pettyCash -
    txns.disbursements -
    txns.shopBankDeposits
  );
}

async function saveDenominations(balanceId: number, items: DenominationInput[]) {
  await prisma.cashDenominationCount.deleteMany({ where: { balanceId } });
  const rows = items.filter((d) => d.quantity > 0);
  if (rows.length === 0) return;
  await prisma.cashDenominationCount.createMany({
    data: rows.map((d) => ({
      balanceId,
      denomination: d.denomination,
      quantity: d.quantity,
    })),
  });
}

async function loadDenominations(balanceId: number) {
  const rows = await prisma.cashDenominationCount.findMany({
    where: { balanceId },
    orderBy: { denomination: 'desc' },
  });
  return rows.map((r) => ({
    denomination: r.denomination,
    quantity: r.quantity,
    subtotal: r.denomination * r.quantity,
  }));
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
    // Opening = previous day's actual counted cash (Closing balance Current);
    // fall back to the book closing balance if no physical count was recorded.
    const opening =
      prev?.physicalCount != null
        ? dec(prev.physicalCount)
        : prev?.closingBalance != null
          ? dec(prev.closingBalance)
          : 0;
    row = await prisma.dailyCashBalance.create({
      data: {
        branchId,
        balanceDate,
        openingBalance: opening,
      },
    });
  }
  return row;
}

function entryCategoryLabel(category: number) {
  if (category === 1) return 'Income';
  if (category === 2) return 'Expense';
  if (category === 4) return 'Top-up';
  return 'Petty cash';
}

function ledgerTypeForCategory(category: number) {
  if (category === 1) return 'income';
  if (category === 2) return 'expense';
  if (category === 4) return 'topup';
  return 'petty_cash';
}

/** Categories that bring cash in (income, top-up); all others move cash out. */
function isCashInCategory(category: number) {
  return category === 1 || category === 4;
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
  let topUp = 0;
  for (const r of rows) {
    const amt = dec(r.amount);
    if (r.category === 1) income += amt;
    else if (r.category === 2) expense += amt;
    else if (r.category === 4) topUp += amt;
    else pettyCash += amt;
  }

  return {
    date,
    branchId,
    income,
    expense,
    pettyCash,
    topUp,
    net: income + topUp - expense - pettyCash,
    entryCount: rows.length,
  };
}

async function getDayTransactions(date: string, branchId: number) {
  const { start, end } = dayRange(date);

  const [partPayments, settledLoans, newLoans, transfersIn, transfersOut, shopDeposits] =
    await Promise.all([
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
    prisma.cashShopDeposit.aggregate({
      where: { branchId, depositDate: { gte: start, lt: end } },
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
    shopBankDeposits: dec(shopDeposits._sum.amount ?? 0),
  };
}

export async function getDailyBalance(date: string, branchId: number) {
  const balanceDate = parseDateOnly(date);
  const row = await ensureDailyBalanceRow(branchId, balanceDate);

  const summary = await getDailySummary(date, branchId);
  const txns = await getDayTransactions(date, branchId);
  const opening = dec(row.openingBalance);
  const bookClosingBalance = computeBookClosingBalance(opening, summary, txns);
  const cashInHand =
    opening +
    summary.income +
    summary.topUp +
    txns.collections +
    txns.transfersIn -
    summary.expense -
    summary.pettyCash -
    txns.disbursements -
    txns.transfersOut -
    txns.shopBankDeposits;

  const cashLimit = await getCashLimit();
  const denominations = await loadDenominations(row.id);

  const { date: _d, branchId: _b, ...summaryRest } = summary;

  return {
    date,
    branchId,
    openingBalance: opening,
    closingBalance: row.closingBalance ? dec(row.closingBalance) : null,
    physicalCount: row.physicalCount ? dec(row.physicalCount) : null,
    recommendedBankDeposit: row.recommendedBankDeposit ? dec(row.recommendedBankDeposit) : null,
    denominations,
    isClosed: row.isClosed,
    cashInHand,
    bookClosingBalance,
    closingVariance: row.closingVariance ? dec(row.closingVariance) : null,
    cashLimit,
    cashOverLimit: cashLimit > 0 && cashInHand > cashLimit,
    excessCash: cashLimit > 0 ? Math.max(0, cashInHand - cashLimit) : 0,
    ...summaryRest,
    ...txns,
    variance:
      row.closingVariance != null
        ? dec(row.closingVariance)
        : row.physicalCount && row.closingBalance
          ? dec(row.physicalCount) - dec(row.closingBalance)
          : null,
  };
}

export async function setOpeningBalance(
  branchId: number,
  input: { date: string; openingBalance: number }
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
    },
    update: {
      openingBalance: input.openingBalance,
    },
  });

  return {
    date: input.date,
    openingBalance: dec(row.openingBalance),
  };
}

export async function closeDay(
  branchId: number,
  input: {
    date: string;
    physicalCount?: number;
    denominations?: DenominationInput[];
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

  const summary = await getDailySummary(input.date, branchId);
  const txns = await getDayTransactions(input.date, branchId);
  const rowBeforeClose = await ensureDailyBalanceRow(branchId, balanceDate);
  const bookClosingBalance = computeBookClosingBalance(
    dec(rowBeforeClose.openingBalance),
    summary,
    txns
  );

  const denomTotal =
    input.denominations && input.denominations.length > 0
      ? sumDenominations(input.denominations)
      : null;

  if (denomTotal != null && denomTotal <= 0) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Enter at least one note or coin count');
  }

  const physicalCount =
    denomTotal != null ? denomTotal : input.physicalCount;

  if (physicalCount == null || physicalCount < 0) {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      'Physical cash count is required — enter note denominations or total count'
    );
  }

  if (
    denomTotal != null &&
    input.physicalCount != null &&
    Math.abs(denomTotal - input.physicalCount) > 0.01
  ) {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      'Denomination total does not match physical count'
    );
  }

  const cashLimit = await getCashLimit();
  const recommendedBankDeposit =
    cashLimit > 0 ? Math.max(0, physicalCount - cashLimit) : 0;

  const closingVariance = physicalCount - bookClosingBalance;

  const row = await prisma.dailyCashBalance.upsert({
    where: { branchId_balanceDate: { branchId, balanceDate } },
    create: {
      branchId,
      balanceDate,
      openingBalance: rowBeforeClose.openingBalance,
      closingBalance: bookClosingBalance,
      physicalCount,
      closingVariance,
      recommendedBankDeposit: recommendedBankDeposit > 0 ? recommendedBankDeposit : null,
      isClosed: true,
      closedOn: new Date(),
      closedBy: userId,
      notes: input.notes ?? '',
    },
    update: {
      closingBalance: bookClosingBalance,
      physicalCount,
      closingVariance,
      recommendedBankDeposit: recommendedBankDeposit > 0 ? recommendedBankDeposit : null,
      isClosed: true,
      closedOn: new Date(),
      closedBy: userId,
      notes: input.notes ?? '',
    },
  });

  if (input.denominations) {
    await saveDenominations(row.id, input.denominations);
  }

  const denominations = await loadDenominations(row.id);

  return {
    date: input.date,
    closingBalance: dec(row.closingBalance!),
    physicalCount: dec(row.physicalCount!),
    bookClosingBalance,
    closingVariance,
    recommendedBankDeposit: recommendedBankDeposit > 0 ? recommendedBankDeposit : null,
    denominations,
    isClosed: true,
    variance: closingVariance,
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

export async function listShopBankDeposits(branchId: number, fromDate?: string, toDate?: string) {
  const where: { branchId: number; depositDate?: { gte?: Date; lte?: Date } } = { branchId };
  if (fromDate || toDate) {
    where.depositDate = {};
    if (fromDate) where.depositDate.gte = parseDateOnly(fromDate);
    if (toDate) where.depositDate.lte = parseDateOnly(toDate);
  }

  const rows = await prisma.cashShopDeposit.findMany({
    where,
    orderBy: [{ depositDate: 'desc' }, { id: 'desc' }],
    take: 100,
  });

  return rows.map((r) => ({
    id: r.id,
    amount: dec(r.amount),
    bankName: r.bankName,
    reference: r.reference,
    depositDate: formatDateOnly(r.depositDate),
    notes: r.notes,
    createdOn: r.createdOn.toISOString(),
  }));
}

export async function createShopBankDeposit(
  branchId: number,
  input: {
    amount: number;
    bankName: string;
    reference?: string;
    depositDate: string;
    notes?: string;
  },
  userId?: number
) {
  const depositDate = parseDateOnly(input.depositDate);
  const balanceRow = await ensureDailyBalanceRow(branchId, depositDate);
  if (balanceRow.isClosed) {
    throw new AppError(409, 'DAY_CLOSED', 'Cannot record deposit on a closed day');
  }

  const row = await prisma.cashShopDeposit.create({
    data: {
      branchId,
      amount: input.amount,
      bankName: input.bankName,
      reference: input.reference ?? '',
      depositDate,
      notes: input.notes ?? '',
      createdBy: userId,
    },
  });

  return {
    id: row.id,
    amount: dec(row.amount),
    bankName: row.bankName,
    reference: row.reference,
    depositDate: formatDateOnly(row.depositDate),
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

  const [entries, partPayments, settledLoans, newLoans, shopDeposits] = await Promise.all([
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
    prisma.cashShopDeposit.findMany({
      where: { branchId, depositDate: { gte: start, lt: end } },
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
        direction: isCashInCategory(e.category) ? 'in' : 'out',
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
    ...shopDeposits.map((d) =>
      ledgerRow({
        sortAt: d.createdOn,
        type: 'bank_deposit',
        description: `Cash deposited to bank — ${d.bankName}${d.reference ? ` (${d.reference})` : ''}`,
        amount: dec(d.amount),
        direction: 'out',
        ref: `BD-${d.id}`,
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
