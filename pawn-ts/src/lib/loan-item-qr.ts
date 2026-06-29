import { prisma } from './prisma.js';

export function buildLoanQrPayload(params: {
  customerName: string;
  customerId: number;
  mobileNo: string;
  receiptNo: number;
}): string {
  return [
    `Customer: ${params.customerName}`,
    `ID: ${params.customerId}`,
    `Mobile: ${params.mobileNo || '—'}`,
    `Receipt: ${params.receiptNo}`,
  ].join('\n');
}

export async function isQrCodesEnabled(): Promise<boolean> {
  const row = await prisma.organizationSettings.findUnique({ where: { id: 1 } });
  return row?.qrCodesEnabled ?? false;
}

export async function assignQrCodeToLoan(loanId: number): Promise<void> {
  if (!(await isQrCodesEnabled())) return;

  const loan = await prisma.loan.findUnique({
    where: { id: BigInt(loanId) },
    include: { customer: true },
  });
  if (!loan) return;

  const payload = buildLoanQrPayload({
    customerName: loan.customer.name,
    customerId: Number(loan.customer.customerId),
    mobileNo: loan.customer.mobileNo,
    receiptNo: Number(loan.invoiceNo),
  });

  await prisma.loan.update({
    where: { id: loan.id },
    data: { qrCode: payload },
  });
}

export async function backfillQrCodesForOpenLoans(): Promise<void> {
  if (!(await isQrCodesEnabled())) return;
  const loans = await prisma.loan.findMany({
    where: { isSettled: 0 },
    select: { id: true },
  });
  for (const loan of loans) {
    await assignQrCodeToLoan(Number(loan.id));
  }
}

/** @deprecated Use assignQrCodeToLoan */
export const assignQrCodesToLoan = assignQrCodeToLoan;
/** @deprecated Use buildLoanQrPayload */
export const buildLoanItemQrPayload = buildLoanQrPayload;
