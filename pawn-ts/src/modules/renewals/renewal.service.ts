import { prisma } from '../../lib/prisma.js';
import {
  assertNoOpenBankDeposit,
  buildInterestCalc,
  dec,
  getOpenLoanOrThrow,
  sumPartPayments,
} from '../../lib/loan-helper.js';
import { computeRenewalDate, formatDateOnly, parseDateOnly } from '../../lib/loan-dates.js';
import { assertSecurityPin } from '../../lib/security.js';
import { AppError } from '../../shared/errors.js';
import { conditionToCode } from '../loans/loan.constants.js';

export async function getSettlementPreview(loanId: number, branchId: number, asOf?: string) {
  const loan = await getOpenLoanOrThrow(loanId, branchId);
  if (loan.isSettled !== 0) {
    throw new AppError(409, 'LOAN_CLOSED', 'Loan is already settled');
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

  const openBank = loan.bankDeposits.length > 0;

  return {
    loanId,
    invoiceNo: Number(loan.invoiceNo),
    customerName: loan.customer.name,
    loanAmount: dec(loan.loanAmount),
    interestRate: dec(loan.interest),
    partPaymentTotal: partTotal,
    calculation: calc,
    canClose: !openBank,
    canRenew: !openBank,
    openBankDeposit: openBank,
  };
}

export async function closeLoan(
  loanId: number,
  branchId: number,
  settledAmount: number,
  loanSettledDate: string,
  securityPin: string,
  interestDisAmt = 0,
  userId = 1
) {
  assertSecurityPin(securityPin);
  const loan = await getOpenLoanOrThrow(loanId, branchId);
  if (loan.isSettled !== 0) {
    throw new AppError(409, 'LOAN_CLOSED', 'Loan is already settled');
  }
  await assertNoOpenBankDeposit(loan.id);

  const partTotal = sumPartPayments(loan.partPayments);
  const settledDate = parseDateOnly(loanSettledDate);
  const calc = buildInterestCalc(
    dec(loan.loanAmount),
    dec(loan.interest),
    loan.loanDate,
    partTotal,
    settledDate
  );
  const expectedNet = calc ? calc.netPayable - interestDisAmt : settledAmount;

  await prisma.$transaction(async (tx) => {
    await tx.loanTopUp.create({
      data: {
        loanId: loan.id,
        closeAmt: settledAmount,
        interestAmt: calc?.interestAmount ?? 0,
        interestDisAmt,
        totMonth: calc?.totalMonths ?? 0,
        totPayAmt: expectedNet,
      },
    });
    await tx.loan.update({
      where: { id: loan.id },
      data: {
        isSettled: 1,
        isBillSettled: 1,
        settledAmount,
        loanSettledDate: settledDate,
        updatedBy: BigInt(userId),
      },
    });
  });

  return {
    loanId,
    invoiceNo: Number(loan.invoiceNo),
    settlementStatus: 1,
    settledAmount,
    loanSettledDate: formatDateOnly(settledDate),
  };
}

export async function renewLoan(
  loanId: number,
  branchId: number,
  input: {
    newInvoiceNo: number;
    newLoanAmount: number;
    loanAmountWords: string;
    loanDate: string;
    interestDisAmt?: number;
  },
  securityPin: string,
  userId = 1
) {
  assertSecurityPin(securityPin);
  const loan = await getOpenLoanOrThrow(loanId, branchId);
  if (loan.isSettled !== 0) {
    throw new AppError(409, 'LOAN_CLOSED', 'Loan is already settled');
  }
  await assertNoOpenBankDeposit(loan.id);

  const existingInvoice = await prisma.loan.findFirst({
    where: { branchId: loan.branchId, invoiceNo: BigInt(input.newInvoiceNo) },
  });
  if (existingInvoice) {
    throw new AppError(409, 'DUPLICATE_INVOICE', 'New receipt number already exists');
  }

  const partTotal = sumPartPayments(loan.partPayments);
  const loanDate = parseDateOnly(input.loanDate);
  const calc = buildInterestCalc(
    dec(loan.loanAmount),
    dec(loan.interest),
    loan.loanDate,
    partTotal,
    loanDate
  );
  const interestDisAmt = input.interestDisAmt ?? 0;

  const conditionCode = conditionToCode(loan.loanCondition);
  const { renewalDate, deadLineMonth } = computeRenewalDate(
    loanDate,
    conditionCode,
    loan.loanConditionDeadlineMonth || undefined,
    (loan.conditionTimeType || undefined) as 1 | 2 | 3 | 4 | undefined
  );

  const result = await prisma.$transaction(async (tx) => {
    const priorChain = loan.oldLoanId.trim();
    const newOldLoanId = priorChain ? `${priorChain},${loan.id}` : String(loan.id);

    await tx.loanTopUp.create({
      data: {
        loanId: loan.id,
        topupAmt: input.newLoanAmount,
        interestAmt: calc?.interestAmount ?? 0,
        interestDisAmt,
        totMonth: calc?.totalMonths ?? 0,
        totPayAmt: calc ? calc.netPayable - interestDisAmt : 0,
      },
    });

    await tx.loan.update({
      where: { id: loan.id },
      data: {
        isSettled: 2,
        isBillSettled: 1,
        settledAmount: calc?.netPayable ?? 0,
        loanSettledDate: loanDate,
        updatedBy: BigInt(userId),
      },
    });

    const newLoan = await tx.loan.create({
      data: {
        customerId: loan.customerId,
        invoiceNo: BigInt(input.newInvoiceNo),
        loanDate,
        loanCondition: loan.loanCondition,
        loanConditionDeadlineMonth: loan.loanConditionDeadlineMonth,
        conditionTimeType: loan.conditionTimeType,
        loanCustomerType: loan.loanCustomerType,
        commodityTypeId: loan.commodityTypeId,
        netWeightGold: loan.netWeightGold,
        netWeightSilver: loan.netWeightSilver,
        loanAmount: input.newLoanAmount,
        loanAmountWords: input.loanAmountWords,
        interest: loan.interest,
        deadLineMonth,
        renewalDate,
        oldLoanId: newOldLoanId,
        branchId: loan.branchId,
        createdBy: BigInt(userId),
        updatedBy: BigInt(userId),
        items: {
          create: loan.items.map((item) => ({
            itemId: item.itemId,
            subCategoryId: item.subCategoryId,
            purityId: item.purityId,
            noOfItems: item.noOfItems,
            netWeight: item.netWeight,
          })),
        },
      },
    });

    return newLoan;
  });

  return {
    oldLoanId: loanId,
    oldInvoiceNo: Number(loan.invoiceNo),
    newLoan: {
      id: Number(result.id),
      invoiceNo: Number(result.invoiceNo),
      loanAmount: dec(result.loanAmount),
      renewalDate: formatDateOnly(result.renewalDate),
      settlementStatus: 0,
    },
  };
}

export async function listDefaultLoans(branchId: number, page = 1, limit = 20) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where = {
    branchId,
    isSettled: 0,
    OR: [{ defaultStatus: true }, { renewalDate: { lt: today } }],
  };

  const [rows, total] = await Promise.all([
    prisma.loan.findMany({
      where,
      include: {
        customer: {
          select: { name: true, mobileNo: true, address1: true },
        },
      },
      orderBy: { renewalDate: 'asc' },
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
      mobileNo: r.customer.mobileNo,
      renewalDate: formatDateOnly(r.renewalDate),
      loanAmount: dec(r.loanAmount),
      defaultStatus: r.defaultStatus,
      isOverdue: r.renewalDate < today,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function setDefaultStatus(loanId: number, branchId: number, defaultStatus: boolean) {
  const loan = await prisma.loan.findUnique({ where: { id: BigInt(loanId) } });
  if (!loan) throw new AppError(404, 'LOAN_NOT_FOUND', 'Loan not found');
  if (loan.branchId !== branchId) {
    throw new AppError(403, 'BRANCH_FORBIDDEN', 'Loan does not belong to the selected branch');
  }

  await prisma.loan.update({
    where: { id: loan.id },
    data: { defaultStatus },
  });

  return { loanId, defaultStatus };
}
