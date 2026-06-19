import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { dec } from '../../lib/loan-helper.js';
import { formatDateOnly } from '../../lib/loan-dates.js';
import { assertLoanInBranch } from '../../lib/branch.js';
import { commodityToId } from '../../lib/interest.js';
import { AppError } from '../../shared/errors.js';
import type { StockStatus } from './inventory.schema.js';

export type { StockStatus };

export function deriveStockStatus(loan: {
  isSettled: number;
  bankDeposits: { isBankSettled: boolean }[];
  auctionNotice: { status: string } | null;
  items?: Array<{ inventoryMeta?: { itemStatus: string | null } | null }>;
}): StockStatus {
  const metaStatus = loan.items?.find((i) => i.inventoryMeta?.itemStatus)?.inventoryMeta?.itemStatus;
  if (metaStatus === 'lost') return 'lost';
  if (metaStatus === 'damaged') return 'damaged';
  if (metaStatus === 'transferred') return 'transferred';
  if (loan.isSettled === 2) return 'renewed';
  if (loan.auctionNotice?.status === 'completed') return 'auctioned';
  if (loan.isSettled === 1 && loan.auctionNotice) return 'auctioned';
  if (loan.isSettled === 1) return 'released';
  if (loan.bankDeposits.some((b) => !b.isBankSettled)) return 'bank_pledged';
  return 'available';
}

function serializeStockRow(row: {
  id: bigint;
  invoiceNo: bigint;
  isSettled: number;
  loanDate: Date;
  renewalDate: Date;
  loanAmount: Prisma.Decimal;
  commodityTypeId: number;
  netWeightGold: Prisma.Decimal;
  netWeightSilver: Prisma.Decimal;
  customer: { name: string; mobileNo: string; customerId: bigint };
  items: Array<{
    subCategory: { nameEn: string };
    item: { nameEn: string };
    purity: { nameEng: string };
    noOfItems: number;
    netWeight: Prisma.Decimal;
    id: bigint;
    inventoryMeta?: {
      barcode: string | null;
      qrCode: string | null;
      location: string | null;
      lockerNo: string | null;
      photoUrl: string | null;
      itemStatus: string | null;
    } | null;
  }>;
  bankDeposits: { isBankSettled: boolean }[];
  auctionNotice: { status: string } | null;
}) {
  const status = deriveStockStatus(row);
  const totalWeight = dec(row.netWeightGold) + dec(row.netWeightSilver);
  return {
    loanId: Number(row.id),
    invoiceNo: Number(row.invoiceNo),
    status,
    customerName: row.customer.name,
    customerId: Number(row.customer.customerId),
    mobileNo: row.customer.mobileNo,
    loanDate: formatDateOnly(row.loanDate),
    renewalDate: formatDateOnly(row.renewalDate),
    loanAmount: dec(row.loanAmount),
    commodityTypeId: row.commodityTypeId,
    commodityLabel: row.commodityTypeId === 1 ? 'Gold' : 'Silver',
    netWeightGold: dec(row.netWeightGold),
    netWeightSilver: dec(row.netWeightSilver),
    totalWeight,
    itemCount: row.items.length,
    items: row.items.map((i) => ({
      id: Number(i.id),
      subCategory: i.subCategory.nameEn,
      item: i.item.nameEn,
      purity: i.purity.nameEng,
      noOfItems: i.noOfItems,
      netWeight: dec(i.netWeight),
      barcode: i.inventoryMeta?.barcode ?? null,
      qrCode: i.inventoryMeta?.qrCode ?? null,
      location: i.inventoryMeta?.location ?? null,
      lockerNo: i.inventoryMeta?.lockerNo ?? null,
      photoUrl: i.inventoryMeta?.photoUrl ?? null,
      itemStatus: i.inventoryMeta?.itemStatus ?? null,
    })),
  };
}

const stockInclude = {
  customer: { select: { name: true, mobileNo: true, customerId: true } },
  items: {
    include: {
      subCategory: true,
      item: true,
      purity: true,
      inventoryMeta: true,
    },
  },
  bankDeposits: { where: { isBankSettled: false } },
  auctionNotice: { select: { status: true } },
} satisfies Prisma.LoanInclude;

/** BRD: Instant stock check by receipt / invoice number */
export async function checkStockByInvoice(invoiceNo: number, branchId: number) {
  const loan = await prisma.loan.findFirst({
    where: { branchId, invoiceNo: BigInt(invoiceNo) },
    include: stockInclude,
  });

  if (!loan) {
    return {
      invoiceNo,
      inStock: false,
      message: 'No loan found for this receipt number',
    };
  }

  const row = serializeStockRow(loan);
  return {
    ...row,
    invoiceNo,
    inStock: row.status === 'available' || row.status === 'bank_pledged',
  };
}

export async function searchStock(params: {
  branchId: number;
  invoiceNo?: number;
  search?: string;
  status?: StockStatus;
  commodityType?: 'gold' | 'silver';
  subCategoryId?: number;
  minWeight?: number;
  maxWeight?: number;
  page: number;
  limit: number;
}) {
  const where: Prisma.LoanWhereInput = { branchId: params.branchId };

  if (params.invoiceNo) {
    where.invoiceNo = BigInt(params.invoiceNo);
  }

  if (params.commodityType) {
    where.commodityTypeId = commodityToId(params.commodityType);
  }

  if (params.subCategoryId) {
    where.items = { some: { subCategoryId: params.subCategoryId } };
  }

  if (params.search?.trim()) {
    const q = params.search.trim();
    const numericId = Number(q);
    if (Number.isInteger(numericId) && numericId > 0) {
      where.OR = [
        { invoiceNo: BigInt(numericId) },
        { customer: { customerId: BigInt(numericId), isDeleted: false } },
      ];
    } else {
      where.OR = [
        {
          customer: {
            isDeleted: false,
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { mobileNo: { contains: q } },
              { fatherHusbandName: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
        {
          items: {
            some: {
              OR: [
                { inventoryMeta: { barcode: { contains: q, mode: 'insensitive' } } },
                { inventoryMeta: { qrCode: { contains: q, mode: 'insensitive' } } },
                { inventoryMeta: { lockerNo: { contains: q, mode: 'insensitive' } } },
              ],
            },
          },
        },
      ];
    }
  }

  const rows = await prisma.loan.findMany({
    where,
    include: stockInclude,
    orderBy: { loanDate: 'desc' },
    take: 500,
  });

  let items = rows.map(serializeStockRow);

  if (params.status) {
    items = items.filter((i) => i.status === params.status);
  }

  if (params.minWeight != null) {
    items = items.filter((i) => i.totalWeight >= params.minWeight!);
  }
  if (params.maxWeight != null) {
    items = items.filter((i) => i.totalWeight <= params.maxWeight!);
  }

  const total = items.length;
  const start = (params.page - 1) * params.limit;
  const paged = items.slice(start, start + params.limit);

  const statusCounts = rows.reduce<Record<string, number>>((acc, r) => {
    const s = deriveStockStatus(r);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  return {
    items: paged,
    statusCounts,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit) || 1,
    },
  };
}

export async function listOverdueInventory(branchId: number, page = 1, limit = 20) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where = { branchId, isSettled: 0, renewalDate: { lt: today } };

  const [rows, total] = await Promise.all([
    prisma.loan.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        items: true,
      },
      orderBy: { renewalDate: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.loan.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      loanId: Number(r.id),
      invoiceNo: Number(r.invoiceNo),
      customerName: r.customer.name,
      renewalDate: formatDateOnly(r.renewalDate),
      loanAmount: dec(r.loanAmount),
      itemCount: r.items.length,
      totalNetWeight: dec(r.netWeightGold) + dec(r.netWeightSilver),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getLoanInventoryDetail(loanId: number, branchId: number) {
  const loan = await prisma.loan.findUnique({
    where: { id: BigInt(loanId) },
    include: {
      items: {
        include: {
          subCategory: true,
          item: true,
          purity: true,
          inventoryMeta: true,
        },
      },
      bankDeposits: true,
      auctionNotice: true,
    },
  });
  if (!loan) throw new AppError(404, 'LOAN_NOT_FOUND', 'Loan not found');
  assertLoanInBranch(loan.branchId, branchId);

  return {
    loanId,
    invoiceNo: Number(loan.invoiceNo),
    settlementStatus: loan.isSettled,
    status: deriveStockStatus(loan),
    items: loan.items.map((i) => ({
      id: Number(i.id),
      subCategory: i.subCategory.nameEn,
      item: i.item.nameEn,
      purity: i.purity.nameEng,
      noOfItems: i.noOfItems,
      netWeight: dec(i.netWeight),
      barcode: i.inventoryMeta?.barcode ?? null,
      qrCode: i.inventoryMeta?.qrCode ?? null,
      location: i.inventoryMeta?.location ?? null,
      lockerNo: i.inventoryMeta?.lockerNo ?? null,
      photoUrl: i.inventoryMeta?.photoUrl ?? null,
      itemStatus: i.inventoryMeta?.itemStatus ?? null,
      notes: i.inventoryMeta?.notes ?? '',
    })),
  };
}

export async function updateItemMeta(
  loanItemId: number,
  branchId: number,
  input: {
    barcode?: string;
    qrCode?: string;
    location?: string;
    lockerNo?: string;
    photoUrl?: string;
    itemStatus?: string;
    notes?: string;
  }
) {
  const item = await prisma.loanItem.findUnique({
    where: { id: BigInt(loanItemId) },
    include: { loan: { select: { branchId: true } } },
  });
  if (!item) throw new AppError(404, 'ITEM_NOT_FOUND', 'Loan item not found');
  assertLoanInBranch(item.loan.branchId, branchId);

  const meta = await prisma.inventoryMeta.upsert({
    where: { loanItemId: item.id },
    create: {
      loanItemId: item.id,
      barcode: input.barcode,
      qrCode: input.qrCode,
      location: input.location,
      lockerNo: input.lockerNo,
      photoUrl: input.photoUrl,
      itemStatus: input.itemStatus,
      notes: input.notes ?? '',
    },
    update: {
      ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
      ...(input.qrCode !== undefined ? { qrCode: input.qrCode } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.lockerNo !== undefined ? { lockerNo: input.lockerNo } : {}),
      ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl } : {}),
      ...(input.itemStatus !== undefined ? { itemStatus: input.itemStatus } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });

  return {
    loanItemId: Number(meta.loanItemId),
    barcode: meta.barcode,
    qrCode: meta.qrCode,
    location: meta.location,
    lockerNo: meta.lockerNo,
    photoUrl: meta.photoUrl,
    itemStatus: meta.itemStatus,
    notes: meta.notes,
  };
}

export async function searchByBarcode(barcode: string, branchId: number) {
  const meta = await prisma.inventoryMeta.findFirst({
    where: {
      OR: [
        { barcode: { equals: barcode, mode: 'insensitive' } },
        { qrCode: { equals: barcode, mode: 'insensitive' } },
      ],
      loanItem: { loan: { branchId } },
    },
    include: {
      loanItem: {
        include: {
          loan: {
            include: stockInclude,
          },
        },
      },
    },
  });

  if (!meta) {
    return { found: false, message: 'No item found for this barcode/QR' };
  }

  const row = serializeStockRow(meta.loanItem.loan);
  return { found: true, ...row, matchedBarcode: meta.barcode, matchedQr: meta.qrCode };
}
