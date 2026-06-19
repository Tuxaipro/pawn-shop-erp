import { prisma } from './prisma.js';

export type CommodityCode = 'gold' | 'silver';
export type CustomerTypeCode = 'general' | 'other';

const commodityIdCache: Partial<Record<CommodityCode, number>> = {};

export function commodityCodeFromNameEn(nameEn: string): CommodityCode {
  return nameEn.trim().toLowerCase() === 'silver' ? 'silver' : 'gold';
}

/** Load Gold/Silver category IDs from DB (call on API startup and after master seed). */
export async function refreshCommodityIdCache() {
  const rows = await prisma.commodityMainCategory.findMany({
    where: { isDeleted: false, status: true },
    select: { id: true, nameEn: true },
  });
  for (const row of rows) {
    commodityIdCache[commodityCodeFromNameEn(row.nameEn)] = row.id;
  }
}

export function commodityToId(code: CommodityCode): number {
  const cached = commodityIdCache[code];
  if (cached != null) return cached;
  return code === 'gold' ? 1 : 2;
}

export function commodityFromId(id: number): CommodityCode {
  if (commodityIdCache.silver === id) return 'silver';
  if (commodityIdCache.gold === id) return 'gold';
  return id === 2 ? 'silver' : 'gold';
}

export async function getInterestRate(
  loanAmount: number,
  commodityType: CommodityCode,
  loanCustomerType: CustomerTypeCode,
  branchId: number
) {
  const commodityTypeId = commodityToId(commodityType);
  const amount = BigInt(Math.floor(loanAmount));

  let slab = await prisma.taxDeclaration.findFirst({
    where: {
      branchId,
      commodityTypeId,
      minAmount: { lte: amount },
      maxAmount: { gte: amount },
    },
  });

  if (!slab) {
    slab = await prisma.taxDeclaration.findFirst({
      where: { branchId, commodityTypeId },
      orderBy: { maxAmount: 'desc' },
    });
  }

  if (!slab) {
    return { interestRate: 0, slab: null };
  }

  const interestRate =
    loanCustomerType === 'other'
      ? Number(slab.taxPercentageOtherShop)
      : Number(slab.taxPercentageGenCus);

  return {
    interestRate,
    slab: {
      minAmount: Number(slab.minAmount),
      maxAmount: Number(slab.maxAmount),
    },
  };
}

export { calculateInterestAmount, calculateInterestMonths, calculatePartPaymentRemaining } from './interest-engine.js';
