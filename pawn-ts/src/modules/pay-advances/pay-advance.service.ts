import { prisma } from '../../lib/prisma.js';
import { dec } from '../../lib/loan-helper.js';
import { parseDateOnly } from '../../lib/loan-dates.js';
import { AppError } from '../../shared/errors.js';

export async function listPayAdvances(branchId: number, status?: string) {
  const where: { branchId: number; status?: string } = { branchId };
  if (status) where.status = status;

  const rows = await prisma.payAdvance.findMany({
    where,
    orderBy: { advanceDate: 'desc' },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    items: rows.map((r) => {
      const dueDate = r.dueDate;
      const daysOverdue =
        dueDate && r.status === 'pending' && dueDate < today
          ? Math.floor((today.getTime() - dueDate.getTime()) / 86400000)
          : 0;
      return {
        id: r.id,
        advanceType: r.advanceType,
        partyName: r.partyName,
        amount: dec(r.amount),
        balance: dec(r.balance),
        advanceDate: r.advanceDate.toISOString().slice(0, 10),
        dueDate: dueDate?.toISOString().slice(0, 10) ?? null,
        purpose: r.purpose,
        status: r.status,
        daysOverdue,
      };
    }),
    totalPending: rows
      .filter((r) => r.status === 'pending')
      .reduce((s, r) => s + dec(r.balance), 0),
  };
}

export async function createPayAdvance(
  branchId: number,
  input: {
    advanceType: string;
    partyName: string;
    amount: number;
    advanceDate: string;
    dueDate?: string;
    purpose?: string;
  },
  userId?: number
) {
  const row = await prisma.payAdvance.create({
    data: {
      branchId,
      advanceType: input.advanceType,
      partyName: input.partyName,
      amount: input.amount,
      balance: input.amount,
      advanceDate: parseDateOnly(input.advanceDate),
      dueDate: input.dueDate ? parseDateOnly(input.dueDate) : null,
      purpose: input.purpose ?? '',
      createdBy: userId,
    },
  });
  return { id: row.id, balance: dec(row.balance) };
}

export async function settlePayAdvance(id: number, settleAmount: number) {
  const row = await prisma.payAdvance.findUnique({ where: { id } });
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Advance not found');

  const balance = dec(row.balance) - settleAmount;
  if (balance < 0) throw new AppError(422, 'VALIDATION_ERROR', 'Settle amount exceeds balance');

  const updated = await prisma.payAdvance.update({
    where: { id },
    data: {
      balance,
      status: balance === 0 ? 'settled' : 'pending',
    },
  });

  await prisma.payAdvanceRecovery.create({
    data: {
      payAdvanceId: id,
      amount: settleAmount,
      recoveryDate: new Date(),
      notes: 'Recovery recorded',
    },
  });

  return { id, balance: dec(updated.balance), status: updated.status };
}

export async function getRecoveries(payAdvanceId: number) {
  const rows = await prisma.payAdvanceRecovery.findMany({
    where: { payAdvanceId },
    orderBy: { recoveryDate: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    amount: dec(r.amount),
    recoveryDate: r.recoveryDate.toISOString().slice(0, 10),
    notes: r.notes,
  }));
}
