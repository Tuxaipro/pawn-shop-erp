import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { dec, getOpenLoanOrThrow } from '../../lib/loan-helper.js';
import { parseDateOnly } from '../../lib/loan-dates.js';
import { assertSecurityPin } from '../../lib/security.js';
import { AppError } from '../../shared/errors.js';

export async function listBankDeposits(params: {
  branchId: number;
  loanId?: number;
  isSettled?: boolean;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page: number;
  limit: number;
}) {
  const loanWhere: Prisma.LoanWhereInput = { branchId: params.branchId };
  if (params.search?.trim()) {
    const q = params.search.trim();
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

  const where: Prisma.BankDepositWhereInput = { loan: loanWhere };
  if (params.loanId) where.loanId = BigInt(params.loanId);
  if (params.isSettled !== undefined) where.isBankSettled = params.isSettled;
  if (params.fromDate || params.toDate) {
    where.depositDate = {
      ...(params.fromDate ? { gte: parseDateOnly(params.fromDate) } : {}),
      ...(params.toDate ? { lte: parseDateOnly(params.toDate) } : {}),
    };
  }

  const [rows, total] = await Promise.all([
    prisma.bankDeposit.findMany({
      where,
      include: {
        loan: {
          include: {
            customer: { select: { name: true, customerId: true, mobileNo: true } },
          },
        },
        customer: { select: { name: true, customerId: true, mobileNo: true } },
      },
      orderBy: [{ depositDate: 'desc' }, { id: 'desc' }],
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.bankDeposit.count({ where }),
  ]);

  return {
    items: rows.map((r) => {
      const customer = r.customer ?? r.loan.customer;
      return {
        id: Number(r.id),
        loanId: Number(r.loanId),
        invoiceNo: Number(r.loan.invoiceNo),
        customerName: customer?.name ?? '',
        customerId: customer ? Number(customer.customerId) : 0,
        mobileNo: customer?.mobileNo ?? '',
        bankName: r.bankName,
        receiptNo: r.receiptNo,
        depositAmount: dec(r.depositAmount),
        depositDate: r.depositDate?.toISOString().slice(0, 10) ?? null,
        closingDate: r.closingDate?.toISOString().slice(0, 10) ?? null,
        isBankSettled: r.isBankSettled,
      };
    }),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

export async function createBankDeposit(input: {
  loanId: number;
  customerId?: number;
  bankName: string;
  receiptNo?: string;
  depositAmount: number;
  depositDate: string;
}, branchId: number, userId = 1) {
  const loan = await getOpenLoanOrThrow(input.loanId, branchId);
  if (loan.isSettled !== 0) {
    throw new AppError(409, 'LOAN_CLOSED', 'Cannot re-pledge a settled loan');
  }

  const open = await prisma.bankDeposit.findFirst({
    where: { loanId: loan.id, isBankSettled: false },
  });
  if (open) {
    throw new AppError(409, 'BANK_DEPOSIT_EXISTS', 'Loan already has an open bank deposit');
  }

  const row = await prisma.bankDeposit.create({
    data: {
      loanId: loan.id,
      customerId: input.customerId ? BigInt(input.customerId) : loan.customerId,
      bankName: input.bankName,
      receiptNo: input.receiptNo ?? '',
      depositAmount: input.depositAmount,
      depositDate: parseDateOnly(input.depositDate),
      createdBy: BigInt(userId),
    },
  });

  return {
    id: Number(row.id),
    loanId: input.loanId,
    bankName: row.bankName,
    depositAmount: dec(row.depositAmount),
    isBankSettled: false,
  };
}

export async function settleBankDeposit(
  id: number,
  branchId: number,
  closingDate: string,
  securityPin: string,
  userId = 1
) {
  assertSecurityPin(securityPin);

  const row = await prisma.bankDeposit.findUnique({
    where: { id: BigInt(id) },
    include: { loan: { select: { branchId: true } } },
  });
  if (!row) throw new AppError(404, 'BANK_DEPOSIT_NOT_FOUND', 'Bank deposit not found');
  if (row.loan.branchId !== branchId) {
    throw new AppError(403, 'BRANCH_FORBIDDEN', 'Deposit does not belong to the selected branch');
  }
  if (row.isBankSettled) {
    throw new AppError(409, 'ALREADY_SETTLED', 'Bank deposit is already settled');
  }

  const updated = await prisma.bankDeposit.update({
    where: { id: row.id },
    data: {
      isBankSettled: true,
      closingDate: parseDateOnly(closingDate),
    },
  });

  return {
    id: Number(updated.id),
    loanId: Number(updated.loanId),
    isBankSettled: true,
    closingDate: updated.closingDate?.toISOString().slice(0, 10),
  };
}

export async function listEligibleLoans(branchId: number, search?: string, page = 1, limit = 20) {
  const where: Prisma.LoanWhereInput = {
    branchId,
    isSettled: 0,
    bankDeposits: { none: { isBankSettled: false } },
  };

  if (search?.trim()) {
    const q = search.trim();
    const numericId = Number(q);
    if (Number.isInteger(numericId) && numericId > 0) {
      where.OR = [
        { invoiceNo: BigInt(numericId) },
        { customer: { customerId: BigInt(numericId), isDeleted: false } },
      ];
    } else {
      where.customer = {
        isDeleted: false,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { mobileNo: { contains: q } },
        ],
      };
    }
  }

  const [rows, total] = await Promise.all([
    prisma.loan.findMany({
      where,
      include: {
        customer: { select: { name: true, customerId: true, mobileNo: true } },
      },
      orderBy: { invoiceNo: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.loan.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: Number(r.id),
      invoiceNo: Number(r.invoiceNo),
      customerName: r.customer.name,
      customerId: Number(r.customer.customerId),
      mobileNo: r.customer.mobileNo,
      loanAmount: dec(r.loanAmount),
      netWeightGold: dec(r.netWeightGold),
      netWeightSilver: dec(r.netWeightSilver),
      commodityTypeId: r.commodityTypeId,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function createBankDepositBatch(
  input: {
    bankName: string;
    receiptNo?: string;
    depositDate: string;
    items: Array<{ loanId: number; depositAmount: number }>;
  },
  branchId: number,
  userId = 1
) {
  const created: Array<{ id: number; loanId: number; depositAmount: number }> = [];
  const errors: Array<{ loanId: number; message: string }> = [];

  await prisma.$transaction(async (tx) => {
    for (const item of input.items) {
      try {
        const loan = await tx.loan.findUnique({
          where: { id: BigInt(item.loanId) },
          include: { bankDeposits: { where: { isBankSettled: false } } },
        });
        if (!loan || loan.branchId !== branchId) {
          errors.push({ loanId: item.loanId, message: 'Loan not found' });
          continue;
        }
        if (loan.isSettled !== 0) {
          errors.push({ loanId: item.loanId, message: 'Loan is not open' });
          continue;
        }
        if (loan.bankDeposits.length > 0) {
          errors.push({ loanId: item.loanId, message: 'Already has open bank deposit' });
          continue;
        }

        const row = await tx.bankDeposit.create({
          data: {
            loanId: loan.id,
            customerId: loan.customerId,
            bankName: input.bankName,
            receiptNo: input.receiptNo ?? '',
            depositAmount: item.depositAmount,
            depositDate: parseDateOnly(input.depositDate),
            createdBy: BigInt(userId),
          },
        });
        created.push({
          id: Number(row.id),
          loanId: item.loanId,
          depositAmount: dec(row.depositAmount),
        });
      } catch {
        errors.push({ loanId: item.loanId, message: 'Failed to create deposit' });
      }
    }
  });

  if (created.length === 0) {
    throw new AppError(422, 'BATCH_FAILED', 'No deposits were created', { errors });
  }

  return { created, errors, successCount: created.length, errorCount: errors.length };
}
