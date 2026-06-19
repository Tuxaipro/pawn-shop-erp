import { prisma } from '../../lib/prisma.js';
import { assertLoanInBranch } from '../../lib/branch.js';
import { buildInterestCalc, dec, sumPartPayments } from '../../lib/loan-helper.js';
import { postJournalEntry } from '../../lib/gl-posting.js';
import { queueFromTemplate } from '../../lib/notifications.js';
import { parseDateOnly } from '../../lib/loan-dates.js';
import { AppError } from '../../shared/errors.js';

export async function listAuctionNotices(params: {
  branchId: number;
  status?: string;
  page: number;
  limit: number;
}) {
  const where: { status?: string; loan: { branchId: number } } = {
    loan: { branchId: params.branchId },
  };
  if (params.status) where.status = params.status;

  const [rows, total] = await Promise.all([
    prisma.auctionNotice.findMany({
      where,
      include: {
        loan: {
          include: {
            customer: { select: { name: true, mobileNo: true } },
          },
        },
      },
      orderBy: { noticeDate: 'desc' },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.auctionNotice.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: Number(r.id),
      loanId: Number(r.loanId),
      invoiceNo: Number(r.loan.invoiceNo),
      customerName: r.loan.customer.name,
      mobileNo: r.loan.customer.mobileNo,
      loanAmount: dec(r.loan.loanAmount),
      noticeDate: r.noticeDate.toISOString().slice(0, 10),
      auctionDate: r.auctionDate?.toISOString().slice(0, 10) ?? null,
      status: r.status,
      saleAmount: r.saleAmount ? dec(r.saleAmount) : null,
      surplusRefund: r.surplusRefund ? dec(r.surplusRefund) : null,
      deficitAmount: r.deficitAmount ? dec(r.deficitAmount) : null,
      refundStatus: r.refundStatus,
      legalNoticeSent: r.legalNoticeSent,
      advertisementSent: r.advertisementSent,
      refundPaidOn: r.refundPaidOn?.toISOString().slice(0, 10) ?? null,
    })),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

export async function listEligibleLoans(branchId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await prisma.loan.findMany({
    where: {
      branchId,
      isSettled: 0,
      renewalDate: { lt: today },
      auctionNotice: null,
    },
    include: { customer: { select: { name: true, mobileNo: true } } },
    orderBy: { renewalDate: 'asc' },
    take: 100,
  });

  return rows.map((r) => ({
    loanId: Number(r.id),
    invoiceNo: Number(r.invoiceNo),
    customerName: r.customer.name,
    mobileNo: r.customer.mobileNo,
    loanAmount: dec(r.loanAmount),
    renewalDate: r.renewalDate.toISOString().slice(0, 10),
    defaultStatus: r.defaultStatus,
  }));
}

export async function createAuctionNotice(
  branchId: number,
  input: {
    loanId: number;
    noticeDate: string;
    auctionDate?: string;
  }
) {
  const loan = await prisma.loan.findUnique({
    where: { id: BigInt(input.loanId) },
    include: { auctionNotice: true, branch: true },
  });
  if (!loan) throw new AppError(404, 'LOAN_NOT_FOUND', 'Loan not found');
  assertLoanInBranch(loan.branchId, branchId);
  if (loan.isSettled !== 0) {
    throw new AppError(409, 'LOAN_CLOSED', 'Auction notice only for open loans');
  }
  if (loan.auctionNotice) {
    throw new AppError(409, 'AUCTION_EXISTS', 'Auction notice already exists for this loan');
  }

  const auctionDate = input.auctionDate ? parseDateOnly(input.auctionDate) : null;
  const redemptionDate = auctionDate
    ? new Date(auctionDate.getTime() - 7 * 86400000)
    : null;

  const row = await prisma.auctionNotice.create({
    data: {
      loanId: loan.id,
      noticeDate: parseDateOnly(input.noticeDate),
      auctionDate,
      redemptionDate,
      status: 'notified',
    },
  });

  const customer = await prisma.customer.findUnique({ where: { id: loan.customerId } });
  if (customer?.mobileNo) {
    await queueFromTemplate(
      'auction_notice',
      {
        recipient: customer.mobileNo,
        customer_name: customer.name,
        loan_id: String(loan.invoiceNo),
        auction_date: auctionDate?.toISOString().slice(0, 10) ?? '',
        branch_name: loan.branch?.name ?? 'Branch',
        amount: String(dec(loan.loanAmount)),
        redemption_date: redemptionDate?.toISOString().slice(0, 10) ?? '',
      },
      {
        branchId: loan.branchId,
        customerId: customer.id,
        loanId: loan.id,
        language: (customer.preferredLanguage as 'en' | 'ta') ?? 'en',
      }
    );
  }

  return {
    id: Number(row.id),
    loanId: input.loanId,
    noticeDate: row.noticeDate.toISOString().slice(0, 10),
    status: row.status,
  };
}

export async function updateAuctionNotice(
  id: number,
  branchId: number,
  input: {
    auctionDate?: string;
    status?: string;
    legalNoticeSent?: boolean;
    advertisementSent?: boolean;
  }
) {
  const existing = await prisma.auctionNotice.findUnique({
    where: { id: BigInt(id) },
    include: { loan: { select: { branchId: true } } },
  });
  if (!existing) throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction notice not found');
  assertLoanInBranch(existing.loan.branchId, branchId);

  const row = await prisma.auctionNotice.update({
    where: { id: existing.id },
    data: {
      ...(input.auctionDate ? { auctionDate: parseDateOnly(input.auctionDate) } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.legalNoticeSent !== undefined ? { legalNoticeSent: input.legalNoticeSent } : {}),
      ...(input.advertisementSent !== undefined ? { advertisementSent: input.advertisementSent } : {}),
    },
  });

  return {
    id: Number(row.id),
    loanId: Number(row.loanId),
    auctionDate: row.auctionDate?.toISOString().slice(0, 10) ?? null,
    status: row.status,
    legalNoticeSent: row.legalNoticeSent,
    advertisementSent: row.advertisementSent,
  };
}

export async function getAuctionSettlementPreview(auctionId: number, branchId?: number) {
  const auction = await prisma.auctionNotice.findUnique({
    where: { id: BigInt(auctionId) },
    include: { loan: { include: { partPayments: true, customer: true } } },
  });
  if (!auction) throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found');
  if (branchId !== undefined) assertLoanInBranch(auction.loan.branchId, branchId);

  const loan = auction.loan;
  const partTotal = sumPartPayments(loan.partPayments);
  const calc = buildInterestCalc(
    dec(loan.loanAmount),
    dec(loan.interest),
    loan.loanDate,
    partTotal
  );

  const principal = dec(loan.loanAmount);
  const interestOwed = calc?.interestAmount ?? 0;
  const penalty = dec(auction.penaltyAmount);
  const charges = dec(auction.auctionCharges);
  const saleAmount = auction.saleAmount ? dec(auction.saleAmount) : 0;
  const totalDeductions = principal + interestOwed + penalty + charges;
  const surplus = saleAmount - totalDeductions;

  return {
    auctionId: Number(auction.id),
    loanId: Number(loan.id),
    invoiceNo: Number(loan.invoiceNo),
    saleAmount,
    principalOutstanding: principal,
    interestOwed,
    penaltyAmount: penalty,
    auctionCharges: charges,
    totalDeductions,
    surplusRefund: Math.max(0, surplus),
    deficitAmount: surplus < 0 ? Math.abs(surplus) : 0,
    customerName: loan.customer.name,
  };
}

export async function recordAuctionSale(
  auctionId: number,
  branchId: number,
  input: { saleAmount: number; buyerName: string; auctionCharges?: number; penaltyAmount?: number }
) {
  const auction = await prisma.auctionNotice.findUnique({
    where: { id: BigInt(auctionId) },
    include: { loan: { select: { branchId: true } } },
  });
  if (!auction) throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found');
  assertLoanInBranch(auction.loan.branchId, branchId);
  if (auction.status === 'completed') {
    throw new AppError(409, 'AUCTION_COMPLETED', 'Auction already completed');
  }

  const row = await prisma.auctionNotice.update({
    where: { id: auction.id },
    data: {
      saleAmount: input.saleAmount,
      buyerName: input.buyerName,
      auctionCharges: input.auctionCharges ?? 0,
      penaltyAmount: input.penaltyAmount ?? 0,
      status: 'sold',
    },
  });

  return {
    id: Number(row.id),
    saleAmount: dec(row.saleAmount!),
    status: row.status,
    settlement: await getAuctionSettlementPreview(auctionId),
  };
}

export async function completeAuction(auctionId: number, branchId: number, userId?: number) {
  const preview = await getAuctionSettlementPreview(auctionId, branchId);
  const auction = await prisma.auctionNotice.findUnique({
    where: { id: BigInt(auctionId) },
    include: { loan: { include: { customer: true, branch: true } } },
  });
  if (!auction) throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found');
  assertLoanInBranch(auction.loan.branchId, branchId);
  if (!auction.saleAmount) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Record sale before completing auction');
  }

  const saleAmount = dec(auction.saleAmount);
  const surplus = preview.surplusRefund;
  const deficit = preview.deficitAmount;

  await prisma.$transaction(async (tx) => {
    await tx.loan.update({
      where: { id: auction.loanId },
      data: {
        isSettled: 1,
        isBillSettled: 1,
        settledAmount: saleAmount,
        loanSettledDate: new Date(),
        defaultStatus: true,
      },
    });
    await tx.auctionNotice.update({
      where: { id: auction.id },
      data: {
        status: 'completed',
        principalOutstanding: preview.principalOutstanding,
        interestOwed: preview.interestOwed,
        surplusRefund: surplus,
        deficitAmount: deficit,
        refundStatus: surplus > 0 ? 'pending' : 'none',
        completedOn: new Date(),
      },
    });
  });

  await postJournalEntry(
    auction.loan.branchId,
    new Date(),
    `Auction settlement LN-${auction.loan.invoiceNo}`,
    [
      { accountCode: '1000', debit: saleAmount },
      { accountCode: '1100', credit: preview.principalOutstanding },
      { accountCode: '4000', credit: preview.interestOwed },
      { accountCode: '4100', credit: preview.penaltyAmount },
      { accountCode: '4200', credit: preview.auctionCharges },
      ...(surplus > 0 ? [{ accountCode: '2100', credit: surplus }] : []),
    ],
    { type: 'auction', id: String(auctionId) },
    userId
  );

  const customer = auction.loan.customer;
  if (customer.mobileNo && surplus > 0) {
    await queueFromTemplate(
      'auction_refund',
      {
        recipient: customer.mobileNo,
        customer_name: customer.name,
        sale_amount: String(saleAmount),
        refund_amount: String(surplus),
        branch_name: auction.loan.branch?.name ?? 'Branch',
      },
      {
        branchId: auction.loan.branchId,
        customerId: customer.id,
        loanId: auction.loanId,
        language: (customer.preferredLanguage as 'en' | 'ta') ?? 'en',
      }
    );
  }

  return {
    auctionId,
    status: 'completed',
    surplusRefund: surplus,
    deficitAmount: deficit,
    refundStatus: surplus > 0 ? 'pending' : 'none',
  };
}

export async function markRefundPaid(auctionId: number, branchId: number) {
  const auction = await prisma.auctionNotice.findUnique({
    where: { id: BigInt(auctionId) },
    include: { loan: { select: { branchId: true } } },
  });
  if (!auction) throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found');
  assertLoanInBranch(auction.loan.branchId, branchId);
  if (auction.refundStatus !== 'pending') {
    throw new AppError(409, 'INVALID_STATE', 'No pending refund for this auction');
  }

  const row = await prisma.auctionNotice.update({
    where: { id: auction.id },
    data: { refundStatus: 'paid', refundPaidOn: new Date() },
  });

  return {
    auctionId: Number(row.id),
    refundStatus: row.refundStatus,
    refundPaidOn: row.refundPaidOn?.toISOString().slice(0, 10),
    surplusRefund: row.surplusRefund ? dec(row.surplusRefund) : 0,
  };
}
