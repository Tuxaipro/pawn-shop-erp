import { prisma } from '../../lib/prisma.js';
import { dec } from '../../lib/loan-helper.js';
import { commodityFromId } from '../../lib/interest.js';
import { conditionToCode, customerTypeToCode } from './loan.constants.js';
import { AppError } from '../../shared/errors.js';
import * as loanService from './loan.service.js';
import type { CreateLoanInput } from './loan.schema.js';

export async function getReloanContext(customerId: number, branchId: number) {
  const customer = await prisma.customer.findFirst({
    where: { id: BigInt(customerId), isDeleted: false },
  });
  if (!customer) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');

  const lastLoan = await prisma.loan.findFirst({
    where: { customerId: customer.id, branchId },
    include: {
      items: {
        include: { subCategory: true, item: true, purity: true },
      },
    },
    orderBy: { loanDate: 'desc' },
  });

  if (!lastLoan) {
    return {
      customerId: Number(customer.id),
      customerName: customer.name,
      hasHistory: false,
      suggestedLoanAmount: null,
      renewalCount: 0,
      previousLoan: null,
      prefillItems: [],
    };
  }

  const renewalCount = await prisma.loan.count({
    where: {
      customerId: customer.id,
      branchId,
      OR: [{ isSettled: 2 }, { oldLoanId: { not: '' } }],
    },
  });

  const lastAmount = dec(lastLoan.loanAmount);
  const suggestedLoanAmount = Math.round(lastAmount * 1.1);

  return {
    customerId: Number(customer.id),
    customerName: customer.name,
    hasHistory: true,
    suggestedLoanAmount,
    renewalCount,
    previousLoan: {
      id: Number(lastLoan.id),
      invoiceNo: Number(lastLoan.invoiceNo),
      loanAmount: lastAmount,
      interest: dec(lastLoan.interest),
      commodityType: commodityFromId(lastLoan.commodityTypeId),
      loanCondition: conditionToCode(lastLoan.loanCondition),
      loanCustomerType: customerTypeToCode(lastLoan.loanCustomerType),
      settlementStatus: lastLoan.isSettled,
    },
    prefillItems: lastLoan.items.map((i) => ({
      subCategoryId: i.subCategoryId,
      subCategoryName: i.subCategory.nameEn,
      itemId: Number(i.itemId),
      itemName: i.item.nameEn,
      purityId: i.purityId,
      purityName: i.purity.nameEng,
      noOfItems: i.noOfItems,
      netWeight: dec(i.netWeight),
    })),
  };
}

export async function createReloan(input: CreateLoanInput, branchId: number, userId = 1) {
  const context = await getReloanContext(input.customerId, branchId);
  if (!context.hasHistory) {
    throw new AppError(422, 'NO_HISTORY', 'No previous loan found for easy reloan');
  }

  return loanService.createLoan(input, branchId, userId);
}
