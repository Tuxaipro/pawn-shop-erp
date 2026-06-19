import { prisma } from './prisma.js';

const DEFAULT_SLABS = [
  { commodityNameEn: 'gold', min: 0n, max: 5000n, gen: 3.0, other: 3.5 },
  { commodityNameEn: 'gold', min: 5001n, max: 25000n, gen: 2.5, other: 3.0 },
  { commodityNameEn: 'gold', min: 25001n, max: 100000n, gen: 2.0, other: 2.5 },
  { commodityNameEn: 'silver', min: 0n, max: 5000n, gen: 4.0, other: 4.5 },
  { commodityNameEn: 'silver', min: 5001n, max: 25000n, gen: 3.5, other: 4.0 },
] as const;

/** Seed default interest slabs for a branch (skips existing ranges). */
export async function seedInterestSlabsForBranch(branchId: number) {
  const categories = await prisma.commodityMainCategory.findMany({
    where: { isDeleted: false },
    select: { id: true, nameEn: true },
  });
  const byName = new Map(categories.map((c) => [c.nameEn.trim().toLowerCase(), c.id]));

  for (const slab of DEFAULT_SLABS) {
    const commodityTypeId = byName.get(slab.commodityNameEn);
    if (!commodityTypeId) continue;

    const existing = await prisma.taxDeclaration.findFirst({
      where: {
        branchId,
        commodityTypeId,
        minAmount: slab.min,
        maxAmount: slab.max,
      },
    });
    if (existing) continue;

    await prisma.taxDeclaration.create({
      data: {
        branchId,
        commodityTypeId,
        minAmount: slab.min,
        maxAmount: slab.max,
        taxPercentageGenCus: slab.gen,
        taxPercentageOtherShop: slab.other,
      },
    });
  }
}

/** Copy interest slabs from one branch to another (e.g. new branch from main). */
export async function copyInterestSlabs(fromBranchId: number, toBranchId: number) {
  const source = await prisma.taxDeclaration.findMany({ where: { branchId: fromBranchId } });
  if (source.length === 0) {
    await seedInterestSlabsForBranch(toBranchId);
    return;
  }

  for (const slab of source) {
    const exists = await prisma.taxDeclaration.findFirst({
      where: {
        branchId: toBranchId,
        commodityTypeId: slab.commodityTypeId,
        minAmount: slab.minAmount,
        maxAmount: slab.maxAmount,
      },
    });
    if (exists) continue;

    await prisma.taxDeclaration.create({
      data: {
        branchId: toBranchId,
        commodityTypeId: slab.commodityTypeId,
        minAmount: slab.minAmount,
        maxAmount: slab.maxAmount,
        taxPercentageGenCus: slab.taxPercentageGenCus,
        taxPercentageOtherShop: slab.taxPercentageOtherShop,
      },
    });
  }
}
