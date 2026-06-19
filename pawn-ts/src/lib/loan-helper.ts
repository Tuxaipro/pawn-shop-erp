import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { calculateInterestAmount } from './interest-engine.js';
import { assertLoanInBranch } from './branch.js';
import { AppError } from '../shared/errors.js';

export function dec(v: Prisma.Decimal | number | bigint): number {
  return Number(v);
}

export async function getOpenLoanOrThrow(loanId: number, branchId?: number) {
  const loan = await prisma.loan.findUnique({
    where: { id: BigInt(loanId) },
    include: {
      customer: true,
      items: {
        include: { subCategory: true, item: true, purity: true },
      },
      partPayments: { orderBy: { payDate: 'asc' } },
      bankDeposits: { where: { isBankSettled: false } },
    },
  });
  if (!loan) throw new AppError(404, 'LOAN_NOT_FOUND', 'Loan not found');
  if (branchId !== undefined) assertLoanInBranch(loan.branchId, branchId);
  return loan;
}

export async function assertNoOpenBankDeposit(loanId: bigint) {
  const open = await prisma.bankDeposit.findFirst({
    where: { loanId, isBankSettled: false },
  });
  if (open) {
    throw new AppError(
      409,
      'BANK_DEPOSIT_OPEN',
      'Loan has an open bank deposit. Settle it before renewal or close.'
    );
  }
}

export function sumPartPayments(
  payments: { amount: Prisma.Decimal }[]
): number {
  return payments.reduce((s, p) => s + dec(p.amount), 0);
}

export function buildInterestCalc(
  loanAmount: number,
  interestRate: number,
  loanDate: Date,
  partPaymentTotal: number,
  asOf: Date = new Date()
) {
  const calc = calculateInterestAmount(
    loanAmount,
    interestRate,
    loanDate,
    partPaymentTotal,
    asOf
  );
  if (calc.status === 0) return null;
  return {
    loanAmount: calc.loanAmount,
    interestAmount: calc.interestAmount,
    totalPayable: calc.totalPayable,
    netPayable: calc.netPayable,
    totalMonths: calc.totalMonths,
    partPaymentTotal: calc.partPaymentTotal,
    dateBreakdown: calc.dateBreakdown,
    halfMonthInterest: calc.halfMonthInterest,
  };
}
