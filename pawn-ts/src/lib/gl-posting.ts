import { prisma } from './prisma.js';
import { AppError } from '../shared/errors.js';

export interface JournalLineInput {
  accountCode: string;
  debit?: number;
  credit?: number;
}

export async function postJournalEntry(
  branchId: number,
  entryDate: Date,
  description: string,
  lines: JournalLineInput[],
  reference?: { type: string; id: string },
  userId?: number
) {
  const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) {
    throw new AppError(422, 'UNBALANCED_ENTRY', 'Journal entry debits must equal credits');
  }

  const accountCodes = [...new Set(lines.map((l) => l.accountCode))];
  const accounts = await prisma.glAccount.findMany({
    where: { branchId, code: { in: accountCodes } },
  });
  const accountMap = new Map(accounts.map((a) => [a.code, a.id]));

  for (const code of accountCodes) {
    if (!accountMap.has(code)) {
      throw new AppError(404, 'GL_ACCOUNT_NOT_FOUND', `GL account ${code} not found for branch`);
    }
  }

  return prisma.journalEntry.create({
    data: {
      branchId,
      entryDate,
      description,
      referenceType: reference?.type,
      referenceId: reference?.id,
      createdBy: userId,
      lines: {
        create: lines.map((l) => ({
          accountId: accountMap.get(l.accountCode)!,
          debit: l.debit ?? 0,
          credit: l.credit ?? 0,
        })),
      },
    },
    include: { lines: { include: { account: true } } },
  });
}

export async function getTrialBalance(branchId: number, asOf: Date) {
  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: { branchId, entryDate: { lte: asOf } },
    },
    include: { account: true },
  });

  const balances = new Map<
    number,
    { code: string; nameEn: string; nameTa: string; debit: number; credit: number }
  >();

  for (const line of lines) {
    const cur = balances.get(line.accountId) ?? {
      code: line.account.code,
      nameEn: line.account.nameEn,
      nameTa: line.account.nameTa,
      debit: 0,
      credit: 0,
    };
    cur.debit += Number(line.debit);
    cur.credit += Number(line.credit);
    balances.set(line.accountId, cur);
  }

  return [...balances.values()].map((b) => ({
    ...b,
    balance: b.debit - b.credit,
  }));
}
