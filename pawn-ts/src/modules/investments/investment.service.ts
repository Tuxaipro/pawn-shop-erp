import { prisma } from '../../lib/prisma.js';
import { dec } from '../../lib/loan-helper.js';
import { parseDateOnly } from '../../lib/loan-dates.js';
import { postJournalEntry } from '../../lib/gl-posting.js';
import { AppError } from '../../shared/errors.js';

export async function listInvestments(branchId: number) {
  const rows = await prisma.investment.findMany({
    where: { branchId },
    orderBy: { investmentDate: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    investorType: r.investorType,
    investorName: r.investorName,
    amount: dec(r.amount),
    investmentDate: r.investmentDate.toISOString().slice(0, 10),
    profitSharePct: dec(r.profitSharePct),
    status: r.status,
    purpose: r.purpose,
  }));
}

export async function getSummary(branchId: number) {
  const rows = await prisma.investment.findMany({ where: { branchId, status: 'active' } });
  const total = rows.reduce((s, r) => s + dec(r.amount), 0);
  const byType = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.investorType] = (acc[r.investorType] ?? 0) + dec(r.amount);
    return acc;
  }, {});
  return { totalCapital: total, byInvestorType: byType, count: rows.length };
}

export async function createInvestment(
  branchId: number,
  input: {
    investorType: string;
    investorName: string;
    amount: number;
    investmentDate: string;
    purpose?: string;
    profitSharePct?: number;
  },
  userId?: number
) {
  const row = await prisma.investment.create({
    data: {
      branchId,
      investorType: input.investorType,
      investorName: input.investorName,
      amount: input.amount,
      investmentDate: parseDateOnly(input.investmentDate),
      purpose: input.purpose ?? '',
      profitSharePct: input.profitSharePct ?? 0,
      createdBy: userId,
    },
  });

  await postJournalEntry(
    branchId,
    parseDateOnly(input.investmentDate),
    `Investment: ${input.investorName}`,
    [
      { accountCode: '1000', debit: input.amount },
      { accountCode: '3000', credit: input.amount },
    ],
    { type: 'investment', id: String(row.id) },
    userId
  );

  await prisma.investmentTransaction.create({
    data: {
      investmentId: row.id,
      txnType: 'deposit',
      amount: input.amount,
      txnDate: parseDateOnly(input.investmentDate),
      notes: input.purpose ?? 'Initial investment',
    },
  });

  return { id: row.id, amount: dec(row.amount), investorName: row.investorName };
}

export async function withdrawInvestment(id: number, userId?: number) {
  const row = await prisma.investment.findUnique({ where: { id } });
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Investment not found');
  if (row.status === 'withdrawn') {
    throw new AppError(409, 'ALREADY_WITHDRAWN', 'Investment already withdrawn');
  }

  const amount = dec(row.amount);
  await prisma.investment.update({ where: { id }, data: { status: 'withdrawn' } });

  await postJournalEntry(
    row.branchId,
    new Date(),
    `Investment withdrawal: ${row.investorName}`,
    [
      { accountCode: '3000', debit: amount },
      { accountCode: '1000', credit: amount },
    ],
    { type: 'investment', id: String(id) },
    userId
  );

  await prisma.investmentTransaction.create({
    data: {
      investmentId: id,
      txnType: 'withdrawal',
      amount,
      txnDate: new Date(),
      notes: 'Full withdrawal',
    },
  });

  return { id, status: 'withdrawn' };
}

export async function getInvestmentLedger(investmentId: number) {
  const investment = await prisma.investment.findUnique({
    where: { id: investmentId },
    include: { transactions: { orderBy: { txnDate: 'asc' } } },
  });
  if (!investment) throw new AppError(404, 'NOT_FOUND', 'Investment not found');

  return {
    id: investment.id,
    investorName: investment.investorName,
    amount: dec(investment.amount),
    status: investment.status,
    profitSharePct: dec(investment.profitSharePct),
    transactions: investment.transactions.map((t) => ({
      id: t.id,
      txnType: t.txnType,
      amount: dec(t.amount),
      txnDate: t.txnDate.toISOString().slice(0, 10),
      notes: t.notes,
    })),
  };
}

export async function recordProfitShare(
  investmentId: number,
  input: { amount: number; txnDate: string; notes?: string }
) {
  const investment = await prisma.investment.findUnique({ where: { id: investmentId } });
  if (!investment) throw new AppError(404, 'NOT_FOUND', 'Investment not found');
  if (investment.status !== 'active') {
    throw new AppError(409, 'INACTIVE', 'Investment is not active');
  }

  const txn = await prisma.investmentTransaction.create({
    data: {
      investmentId,
      txnType: 'profit_share',
      amount: input.amount,
      txnDate: parseDateOnly(input.txnDate),
      notes: input.notes ?? 'Profit share distribution',
    },
  });

  return {
    id: txn.id,
    txnType: txn.txnType,
    amount: dec(txn.amount),
    txnDate: txn.txnDate.toISOString().slice(0, 10),
  };
}
