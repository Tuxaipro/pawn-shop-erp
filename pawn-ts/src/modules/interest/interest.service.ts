import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import {
  buildInterestCalc,
  dec,
  getOpenLoanOrThrow,
  sumPartPayments,
} from '../../lib/loan-helper.js';
import { parseDateOnly } from '../../lib/loan-dates.js';
import { AppError } from '../../shared/errors.js';

export async function getLoanInterest(loanId: number, branchId: number, asOf?: string) {
  const loan = await getOpenLoanOrThrow(loanId, branchId);
  if (loan.isSettled !== 0) {
    throw new AppError(409, 'LOAN_CLOSED', 'Interest is only calculated for open loans');
  }

  const partTotal = sumPartPayments(loan.partPayments);
  const asOfDate = asOf ? parseDateOnly(asOf) : new Date();
  const calc = buildInterestCalc(
    dec(loan.loanAmount),
    dec(loan.interest),
    loan.loanDate,
    partTotal,
    asOfDate
  );

  return {
    loanId,
    invoiceNo: Number(loan.invoiceNo),
    loanAmount: dec(loan.loanAmount),
    interestRate: dec(loan.interest),
    loanDate: loan.loanDate.toISOString().slice(0, 10),
    partPayments: loan.partPayments.map((p) => ({
      id: Number(p.id),
      amount: dec(p.amount),
      payDate: p.payDate.toISOString().slice(0, 10),
    })),
    calculation: calc,
  };
}

export async function listPartPayments(loanId: number, branchId: number) {
  await getOpenLoanOrThrow(loanId, branchId);
  const rows = await prisma.loanPartPayment.findMany({
    where: { loanId: BigInt(loanId) },
    orderBy: { payDate: 'desc' },
  });
  return rows.map((r) => ({
    id: Number(r.id),
    loanId,
    amount: dec(r.amount),
    payDate: r.payDate.toISOString().slice(0, 10),
  }));
}

async function getPartPaymentForBranch(id: number, branchId: number) {
  const row = await prisma.loanPartPayment.findFirst({
    where: { id: BigInt(id), loan: { branchId } },
    include: {
      loan: { include: { partPayments: { orderBy: { payDate: 'asc' } } } },
    },
  });
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', 'Part payment not found');
  }
  return row;
}

export async function listBranchPartPayments(
  branchId: number,
  options: {
    page?: number;
    limit?: number;
    fromDate?: string;
    toDate?: string;
    search?: string;
  } = {}
) {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;

  const loanWhere: Prisma.LoanWhereInput = { branchId };

  if (options.search?.trim()) {
    const q = options.search.trim();
    const numericId = Number(q);
    const customerOr: Prisma.CustomerWhereInput[] = [
      { name: { contains: q, mode: 'insensitive' } },
      { mobileNo: { contains: q } },
    ];
    if (Number.isInteger(numericId) && numericId > 0) {
      customerOr.push({ customerId: BigInt(numericId) });
    }
    loanWhere.customer = { isDeleted: false, OR: customerOr };
  }

  const where: Prisma.LoanPartPaymentWhereInput = { loan: loanWhere };

  if (options.fromDate || options.toDate) {
    where.payDate = {
      ...(options.fromDate ? { gte: parseDateOnly(options.fromDate) } : {}),
      ...(options.toDate ? { lte: parseDateOnly(options.toDate) } : {}),
    };
  }

  const [rows, total] = await Promise.all([
    prisma.loanPartPayment.findMany({
      where,
      include: {
        loan: {
          include: {
            customer: {
              select: { name: true, customerId: true, mobileNo: true },
            },
          },
        },
      },
      orderBy: [{ payDate: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.loanPartPayment.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: Number(r.id),
      loanId: Number(r.loanId),
      invoiceNo: Number(r.loan.invoiceNo),
      customerName: r.loan.customer.name,
      customerId: Number(r.loan.customer.customerId),
      mobileNo: r.loan.customer.mobileNo,
      amount: dec(r.amount),
      payDate: r.payDate.toISOString().slice(0, 10),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updatePartPayment(
  id: number,
  branchId: number,
  amount: number,
  payDate: string
) {
  const existing = await getPartPaymentForBranch(id, branchId);
  const loan = existing.loan;

  if (loan.isSettled !== 0) {
    throw new AppError(409, 'LOAN_CLOSED', 'Cannot update partial payment on a closed loan');
  }

  const payDateParsed = parseDateOnly(payDate);
  const otherPayments = loan.partPayments.filter((p) => p.id !== existing.id);
  const partTotal = sumPartPayments(otherPayments) + amount;
  const calc = buildInterestCalc(
    dec(loan.loanAmount),
    dec(loan.interest),
    loan.loanDate,
    partTotal,
    payDateParsed
  );

  if (calc && amount > calc.totalPayable) {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      'Partial payment exceeds total payable amount'
    );
  }

  const row = await prisma.loanPartPayment.update({
    where: { id: BigInt(id) },
    data: { amount, payDate: payDateParsed },
  });

  return {
    id: Number(row.id),
    loanId: Number(row.loanId),
    amount: dec(row.amount),
    payDate: row.payDate.toISOString().slice(0, 10),
  };
}

export async function deletePartPayment(id: number, branchId: number) {
  const existing = await getPartPaymentForBranch(id, branchId);
  if (existing.loan.isSettled !== 0) {
    throw new AppError(409, 'LOAN_CLOSED', 'Cannot delete partial payment on a closed loan');
  }

  await prisma.loanPartPayment.delete({ where: { id: BigInt(id) } });
  return { id };
}

export async function createPartPayment(
  loanId: number,
  branchId: number,
  amount: number,
  payDate: string,
  userId = 1
) {
  const loan = await getOpenLoanOrThrow(loanId, branchId);
  if (loan.isSettled !== 0) {
    throw new AppError(409, 'LOAN_CLOSED', 'Cannot add partial payment to a closed loan');
  }

  const payDateParsed = parseDateOnly(payDate);
  const partTotal = sumPartPayments(loan.partPayments) + amount;
  const calc = buildInterestCalc(
    dec(loan.loanAmount),
    dec(loan.interest),
    loan.loanDate,
    partTotal,
    payDateParsed
  );

  if (calc && amount > calc.totalPayable) {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      'Partial payment exceeds total payable amount'
    );
  }

  const row = await prisma.loanPartPayment.create({
    data: {
      loanId: BigInt(loanId),
      amount,
      payDate: payDateParsed,
      createdBy: BigInt(userId),
    },
  });

  const updatedTotal = sumPartPayments([...loan.partPayments, row]);
  const updatedCalc = buildInterestCalc(
    dec(loan.loanAmount),
    dec(loan.interest),
    loan.loanDate,
    updatedTotal
  );

  return {
    id: Number(row.id),
    loanId,
    amount: dec(row.amount),
    payDate: row.payDate.toISOString().slice(0, 10),
    calculation: updatedCalc,
  };
}
