import { prisma } from '../../lib/prisma.js';
import { getTrialBalance, postJournalEntry } from '../../lib/gl-posting.js';
import { parseDateOnly } from '../../lib/loan-dates.js';

export async function listAccounts(branchId: number) {
  const rows = await prisma.glAccount.findMany({
    where: { branchId },
    orderBy: { code: 'asc' },
  });
  return rows.map((a) => ({
    id: a.id,
    code: a.code,
    nameEn: a.nameEn,
    nameTa: a.nameTa,
    accountType: a.accountType,
  }));
}

export async function listJournalEntries(branchId: number, fromDate?: string, toDate?: string) {
  const where: { branchId: number; entryDate?: { gte?: Date; lte?: Date } } = { branchId };
  if (fromDate || toDate) {
    where.entryDate = {};
    if (fromDate) where.entryDate.gte = parseDateOnly(fromDate);
    if (toDate) where.entryDate.lte = parseDateOnly(toDate);
  }

  const rows = await prisma.journalEntry.findMany({
    where,
    include: {
      lines: { include: { account: { select: { code: true, nameEn: true } } } },
    },
    orderBy: { entryDate: 'desc' },
    take: 100,
  });

  return rows.map((e) => ({
    id: Number(e.id),
    entryDate: e.entryDate.toISOString().slice(0, 10),
    description: e.description,
    referenceType: e.referenceType,
    lines: e.lines.map((l) => ({
      accountCode: l.account.code,
      accountName: l.account.nameEn,
      debit: Number(l.debit),
      credit: Number(l.credit),
    })),
  }));
}

export async function createManualEntry(
  branchId: number,
  entryDate: string,
  description: string,
  lines: { accountCode: string; debit?: number; credit?: number }[],
  userId?: number
) {
  const entry = await postJournalEntry(
    branchId,
    parseDateOnly(entryDate),
    description,
    lines,
    undefined,
    userId
  );
  return { id: Number(entry.id), description: entry.description };
}

export async function trialBalance(branchId: number, asOf?: string) {
  const date = asOf ? parseDateOnly(asOf) : new Date();
  return getTrialBalance(branchId, date);
}

export async function subLedger(branchId: number, accountCode: string, fromDate?: string, toDate?: string) {
  const account = await prisma.glAccount.findUnique({
    where: { branchId_code: { branchId, code: accountCode } },
  });
  if (!account) return { accountCode, lines: [], totalDebit: 0, totalCredit: 0, balance: 0 };

  const where: { accountId: number; journalEntry: { branchId: number; entryDate?: { gte?: Date; lte?: Date } } } = {
    accountId: account.id,
    journalEntry: { branchId },
  };
  if (fromDate || toDate) {
    where.journalEntry.entryDate = {};
    if (fromDate) where.journalEntry.entryDate.gte = parseDateOnly(fromDate);
    if (toDate) where.journalEntry.entryDate.lte = parseDateOnly(toDate);
  }

  const lines = await prisma.journalLine.findMany({
    where,
    include: {
      journalEntry: { select: { entryDate: true, description: true, referenceType: true } },
    },
    orderBy: { journalEntry: { entryDate: 'asc' } },
    take: 200,
  });

  let totalDebit = 0;
  let totalCredit = 0;
  const items = lines.map((l) => {
    const debit = Number(l.debit);
    const credit = Number(l.credit);
    totalDebit += debit;
    totalCredit += credit;
    return {
      entryDate: l.journalEntry.entryDate.toISOString().slice(0, 10),
      description: l.journalEntry.description,
      referenceType: l.journalEntry.referenceType,
      debit,
      credit,
    };
  });

  return {
    accountCode,
    accountName: account.nameEn,
    accountType: account.accountType,
    totalDebit,
    totalCredit,
    balance: totalDebit - totalCredit,
    lines: items,
  };
}
