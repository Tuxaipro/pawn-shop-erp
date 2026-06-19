import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { pickLocalizedName, serializeBilingualName } from '../../lib/localized-name.js';
import { AppError } from '../../shared/errors.js';
import type { BilingualNameInput } from './master.schema.js';

type CategoryRow = { id: number; nameEn: string; nameTa: string; status: boolean };
type CategoryWithRel = CategoryRow & { commodityType?: { nameEn: string; nameTa: string } };
type SubCategoryWithRel = CategoryRow & {
  commodityTypeId: number;
  commodityType?: { nameEn: string; nameTa: string };
};
type SubItemWithRel = {
  id: bigint;
  nameEn: string;
  nameTa: string;
  status: boolean;
  commodityTypeId: number;
  subCategoryId: number;
  commodityType?: { nameEn: string; nameTa: string };
  subCategory?: { nameEn: string; nameTa: string };
};

function serializeCategory(row: CategoryRow) {
  return { id: row.id, status: row.status, ...serializeBilingualName(row) };
}

function relName(row?: { nameEn: string; nameTa: string }, lang = 'en') {
  if (!row) return '';
  return pickLocalizedName(row, lang);
}

function serializeSubCategory(row: SubCategoryWithRel, lang = 'en') {
  return {
    id: row.id,
    status: row.status,
    commodityTypeId: row.commodityTypeId,
    ...serializeBilingualName(row),
    commodityTypeName: relName(row.commodityType, lang),
    commodityTypeNameEn: row.commodityType?.nameEn ?? '',
    commodityTypeNameTa: row.commodityType?.nameTa ?? '',
  };
}

function serializeSubItem(row: SubItemWithRel, lang = 'en') {
  return {
    id: Number(row.id),
    status: row.status,
    commodityTypeId: row.commodityTypeId,
    subCategoryId: row.subCategoryId,
    ...serializeBilingualName(row),
    commodityTypeName: relName(row.commodityType, lang),
    subCategoryName: relName(row.subCategory, lang),
    commodityTypeNameEn: row.commodityType?.nameEn ?? '',
    commodityTypeNameTa: row.commodityType?.nameTa ?? '',
    subCategoryNameEn: row.subCategory?.nameEn ?? '',
    subCategoryNameTa: row.subCategory?.nameTa ?? '',
  };
}

function serializeSlab(row: {
  id: number;
  commodityTypeId: number;
  minAmount: bigint;
  maxAmount: bigint;
  taxPercentageGenCus: Prisma.Decimal;
  taxPercentageOtherShop: Prisma.Decimal;
  commodityType?: { nameEn: string; nameTa: string };
}) {
  return {
    id: row.id,
    commodityTypeId: row.commodityTypeId,
    commodityTypeName: row.commodityType?.nameEn ?? '',
    commodityTypeNameEn: row.commodityType?.nameEn ?? '',
    commodityTypeNameTa: row.commodityType?.nameTa ?? '',
    minAmount: Number(row.minAmount),
    maxAmount: Number(row.maxAmount),
    taxPercentageGenCus: Number(row.taxPercentageGenCus),
    taxPercentageOtherShop: Number(row.taxPercentageOtherShop),
  };
}

function nameData(input: BilingualNameInput) {
  return { nameEn: input.nameEn.trim(), nameTa: input.nameTa?.trim() ?? '' };
}

async function assertActiveCategory(commodityTypeId: number) {
  const cat = await prisma.commodityMainCategory.findFirst({
    where: { id: commodityTypeId, isDeleted: false, status: true },
  });
  if (!cat) throw new AppError(400, 'INVALID_CATEGORY', 'Commodity category not found or inactive');
  return cat;
}

async function assertActiveSubCategory(subCategoryId: number, commodityTypeId: number) {
  const sub = await prisma.commoditySubCategory.findFirst({
    where: { id: subCategoryId, commodityTypeId, isDeleted: false, status: true },
  });
  if (!sub) throw new AppError(400, 'INVALID_SUB_CATEGORY', 'Sub category not found or inactive');
  return sub;
}

const softDeleteFlags = { isDeleted: true, status: false } as const;

async function assertSubItemNotInUse(itemId: bigint) {
  const used = await prisma.loanItem.findFirst({ where: { itemId }, select: { id: true } });
  if (used) {
    throw new AppError(
      409,
      'SUB_ITEM_IN_USE',
      'Cannot delete: sub item is used in loan collateral records'
    );
  }
}

async function assertSubCategoryNotInUse(subCategoryId: number) {
  const used = await prisma.loanItem.findFirst({
    where: { subCategoryId },
    select: { id: true },
  });
  if (used) {
    throw new AppError(
      409,
      'SUB_CATEGORY_IN_USE',
      'Cannot delete: sub category is used in loan collateral records'
    );
  }
}

async function assertCategoryDeletable(commodityTypeId: number) {
  const loan = await prisma.loan.findFirst({
    where: { commodityTypeId },
    select: { id: true },
  });
  if (loan) {
    throw new AppError(
      409,
      'CATEGORY_IN_USE',
      'Cannot delete: category is used by existing loans'
    );
  }

  const subCategories = await prisma.commoditySubCategory.findMany({
    where: { commodityTypeId, isDeleted: false },
    select: { id: true },
  });
  const subCategoryIds = subCategories.map((s) => s.id);

  if (subCategoryIds.length > 0) {
    const usedSubCat = await prisma.loanItem.findFirst({
      where: { subCategoryId: { in: subCategoryIds } },
      select: { id: true },
    });
    if (usedSubCat) {
      throw new AppError(
        409,
        'SUB_CATEGORY_IN_USE',
        'Cannot delete: a sub category under this category is used in loan collateral records'
      );
    }
  }

  const subItems = await prisma.commoditySubItem.findMany({
    where: { commodityTypeId, isDeleted: false },
    select: { id: true },
  });
  const subItemIds = subItems.map((i) => i.id);

  if (subItemIds.length > 0) {
    const usedItem = await prisma.loanItem.findFirst({
      where: { itemId: { in: subItemIds } },
      select: { id: true },
    });
    if (usedItem) {
      throw new AppError(
        409,
        'SUB_ITEM_IN_USE',
        'Cannot delete: a sub item under this category is used in loan collateral records'
      );
    }
  }
}

// ─── Commodity Category ─────────────────────────────────────────────────────

export async function listCategories(includeInactive = false) {
  const rows = await prisma.commodityMainCategory.findMany({
    where: { isDeleted: false, ...(includeInactive ? {} : {}) },
    orderBy: { id: 'asc' },
  });
  return rows.map(serializeCategory);
}

export async function createCategory(input: BilingualNameInput) {
  const data = nameData(input);
  const existing = await prisma.commodityMainCategory.findFirst({
    where: { nameEn: { equals: data.nameEn, mode: 'insensitive' }, isDeleted: false },
  });
  if (existing) throw new AppError(409, 'DUPLICATE_NAME', 'Category name already exists');

  const row = await prisma.commodityMainCategory.create({ data });
  return serializeCategory(row);
}

export async function updateCategory(id: number, input: BilingualNameInput) {
  const existing = await prisma.commodityMainCategory.findFirst({
    where: { id, isDeleted: false },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Category not found');

  const data = nameData(input);
  const dup = await prisma.commodityMainCategory.findFirst({
    where: {
      nameEn: { equals: data.nameEn, mode: 'insensitive' },
      isDeleted: false,
      id: { not: id },
    },
  });
  if (dup) throw new AppError(409, 'DUPLICATE_NAME', 'Category name already exists');

  const row = await prisma.commodityMainCategory.update({ where: { id }, data });
  return serializeCategory(row);
}

export async function toggleCategoryStatus(id: number) {
  const existing = await prisma.commodityMainCategory.findFirst({
    where: { id, isDeleted: false },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Category not found');

  const row = await prisma.commodityMainCategory.update({
    where: { id },
    data: { status: !existing.status },
  });
  return serializeCategory(row);
}

export async function deleteCategory(id: number) {
  const existing = await prisma.commodityMainCategory.findFirst({
    where: { id, isDeleted: false },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Category not found');

  await assertCategoryDeletable(id);

  await prisma.$transaction([
    prisma.commoditySubItem.updateMany({
      where: { commodityTypeId: id, isDeleted: false },
      data: softDeleteFlags,
    }),
    prisma.commoditySubCategory.updateMany({
      where: { commodityTypeId: id, isDeleted: false },
      data: softDeleteFlags,
    }),
    prisma.taxDeclaration.deleteMany({ where: { commodityTypeId: id } }),
    prisma.commodityMainCategory.update({
      where: { id },
      data: softDeleteFlags,
    }),
  ]);

  return { id, deleted: true };
}

// ─── Commodity Sub Category ─────────────────────────────────────────────────

export async function listSubCategories(params: {
  commodityTypeId?: number;
  includeInactive?: boolean;
}) {
  const rows = await prisma.commoditySubCategory.findMany({
    where: {
      isDeleted: false,
      ...(params.commodityTypeId ? { commodityTypeId: params.commodityTypeId } : {}),
    },
    include: { commodityType: true },
    orderBy: [{ commodityTypeId: 'asc' }, { nameEn: 'asc' }],
  });
  return rows.map((r) => serializeSubCategory(r));
}

export async function createSubCategory(commodityTypeId: number, input: BilingualNameInput) {
  await assertActiveCategory(commodityTypeId);
  const data = nameData(input);

  const existing = await prisma.commoditySubCategory.findFirst({
    where: {
      commodityTypeId,
      nameEn: { equals: data.nameEn, mode: 'insensitive' },
      isDeleted: false,
    },
  });
  if (existing) throw new AppError(409, 'DUPLICATE_NAME', 'Sub category name already exists');

  const row = await prisma.commoditySubCategory.create({
    data: { commodityTypeId, ...data },
    include: { commodityType: true },
  });
  return serializeSubCategory(row);
}

export async function updateSubCategory(id: number, input: BilingualNameInput) {
  const existing = await prisma.commoditySubCategory.findFirst({
    where: { id, isDeleted: false },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Sub category not found');

  const data = nameData(input);
  const dup = await prisma.commoditySubCategory.findFirst({
    where: {
      commodityTypeId: existing.commodityTypeId,
      nameEn: { equals: data.nameEn, mode: 'insensitive' },
      isDeleted: false,
      id: { not: id },
    },
  });
  if (dup) throw new AppError(409, 'DUPLICATE_NAME', 'Sub category name already exists');

  const row = await prisma.commoditySubCategory.update({
    where: { id },
    data,
    include: { commodityType: true },
  });
  return serializeSubCategory(row);
}

export async function toggleSubCategoryStatus(id: number) {
  const existing = await prisma.commoditySubCategory.findFirst({
    where: { id, isDeleted: false },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Sub category not found');

  const row = await prisma.commoditySubCategory.update({
    where: { id },
    data: { status: !existing.status },
    include: { commodityType: true },
  });
  return serializeSubCategory(row);
}

export async function deleteSubCategory(id: number) {
  const existing = await prisma.commoditySubCategory.findFirst({
    where: { id, isDeleted: false },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Sub category not found');

  await assertSubCategoryNotInUse(id);

  const subItemIds = (
    await prisma.commoditySubItem.findMany({
      where: { subCategoryId: id, isDeleted: false },
      select: { id: true },
    })
  ).map((i) => i.id);

  if (subItemIds.length > 0) {
    const usedItem = await prisma.loanItem.findFirst({
      where: { itemId: { in: subItemIds } },
      select: { id: true },
    });
    if (usedItem) {
      throw new AppError(
        409,
        'SUB_ITEM_IN_USE',
        'Cannot delete: a sub item under this sub category is used in loan collateral records'
      );
    }
  }

  await prisma.$transaction([
    prisma.commoditySubItem.updateMany({
      where: { subCategoryId: id, isDeleted: false },
      data: softDeleteFlags,
    }),
    prisma.commoditySubCategory.update({
      where: { id },
      data: softDeleteFlags,
    }),
  ]);

  return { id, deleted: true };
}

// ─── Commodity Sub Item ─────────────────────────────────────────────────────

export async function listSubItems(params: {
  commodityTypeId?: number;
  subCategoryId?: number;
  includeInactive?: boolean;
}) {
  const rows = await prisma.commoditySubItem.findMany({
    where: {
      isDeleted: false,
      ...(params.commodityTypeId ? { commodityTypeId: params.commodityTypeId } : {}),
      ...(params.subCategoryId ? { subCategoryId: params.subCategoryId } : {}),
    },
    include: { commodityType: true, subCategory: true },
    orderBy: [{ commodityTypeId: 'asc' }, { subCategoryId: 'asc' }, { nameEn: 'asc' }],
  });
  return rows.map((r) => serializeSubItem(r));
}

export async function createSubItem(
  commodityTypeId: number,
  subCategoryId: number,
  input: BilingualNameInput
) {
  await assertActiveCategory(commodityTypeId);
  await assertActiveSubCategory(subCategoryId, commodityTypeId);
  const data = nameData(input);

  const existing = await prisma.commoditySubItem.findFirst({
    where: {
      commodityTypeId,
      subCategoryId,
      nameEn: { equals: data.nameEn, mode: 'insensitive' },
      isDeleted: false,
    },
  });
  if (existing) throw new AppError(409, 'DUPLICATE_NAME', 'Sub item name already exists');

  const row = await prisma.commoditySubItem.create({
    data: { commodityTypeId, subCategoryId, ...data },
    include: { commodityType: true, subCategory: true },
  });
  return serializeSubItem(row);
}

export async function updateSubItem(id: number, input: BilingualNameInput) {
  const existing = await prisma.commoditySubItem.findFirst({
    where: { id: BigInt(id), isDeleted: false },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Sub item not found');

  const data = nameData(input);
  const dup = await prisma.commoditySubItem.findFirst({
    where: {
      commodityTypeId: existing.commodityTypeId,
      subCategoryId: existing.subCategoryId,
      nameEn: { equals: data.nameEn, mode: 'insensitive' },
      isDeleted: false,
      id: { not: existing.id },
    },
  });
  if (dup) throw new AppError(409, 'DUPLICATE_NAME', 'Sub item name already exists');

  const row = await prisma.commoditySubItem.update({
    where: { id: existing.id },
    data,
    include: { commodityType: true, subCategory: true },
  });
  return serializeSubItem(row);
}

export async function toggleSubItemStatus(id: number) {
  const existing = await prisma.commoditySubItem.findFirst({
    where: { id: BigInt(id), isDeleted: false },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Sub item not found');

  const row = await prisma.commoditySubItem.update({
    where: { id: existing.id },
    data: { status: !existing.status },
    include: { commodityType: true, subCategory: true },
  });
  return serializeSubItem(row);
}

export async function deleteSubItem(id: number) {
  const existing = await prisma.commoditySubItem.findFirst({
    where: { id: BigInt(id), isDeleted: false },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Sub item not found');

  await assertSubItemNotInUse(existing.id);

  await prisma.commoditySubItem.update({
    where: { id: existing.id },
    data: softDeleteFlags,
  });
  return { id, deleted: true };
}

// ─── Interest / Tax Declaration (slabs) ─────────────────────────────────────

export async function listSlabs(branchId: number, commodityTypeId: number) {
  await assertActiveCategory(commodityTypeId);
  const rows = await prisma.taxDeclaration.findMany({
    where: { branchId, commodityTypeId },
    include: { commodityType: true },
    orderBy: { minAmount: 'asc' },
  });
  return rows.map(serializeSlab);
}

export async function getNextMinAmount(branchId: number, commodityTypeId: number) {
  await assertActiveCategory(commodityTypeId);
  const agg = await prisma.taxDeclaration.aggregate({
    where: { branchId, commodityTypeId },
    _max: { maxAmount: true },
  });
  const max = agg._max.maxAmount;
  return { minAmount: max !== null ? Number(max) + 1 : 0 };
}

async function assertNoSlabOverlap(
  branchId: number,
  commodityTypeId: number,
  minAmount: bigint,
  maxAmount: bigint,
  excludeId?: number
) {
  const overlap = await prisma.taxDeclaration.findFirst({
    where: {
      branchId,
      commodityTypeId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      minAmount: { lte: maxAmount },
      maxAmount: { gte: minAmount },
    },
  });
  if (overlap) {
    throw new AppError(409, 'SLAB_OVERLAP', 'Amount range overlaps an existing slab');
  }
}

export async function createSlab(input: {
  branchId: number;
  commodityTypeId: number;
  minAmount: number;
  maxAmount: number;
  taxPercentageGenCus: number;
  taxPercentageOtherShop: number;
}) {
  await assertActiveCategory(input.commodityTypeId);
  const min = BigInt(input.minAmount);
  const max = BigInt(input.maxAmount);
  await assertNoSlabOverlap(input.branchId, input.commodityTypeId, min, max);

  const row = await prisma.taxDeclaration.create({
    data: {
      branchId: input.branchId,
      commodityTypeId: input.commodityTypeId,
      minAmount: min,
      maxAmount: max,
      taxPercentageGenCus: input.taxPercentageGenCus,
      taxPercentageOtherShop: input.taxPercentageOtherShop,
    },
    include: { commodityType: true },
  });
  return serializeSlab(row);
}

export async function updateInterestRates(
  id: number,
  branchId: number,
  rates: { taxPercentageGenCus: number; taxPercentageOtherShop?: number }
) {
  const existing = await prisma.taxDeclaration.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Slab not found');
  if (existing.branchId !== branchId) {
    throw new AppError(403, 'BRANCH_FORBIDDEN', 'Slab does not belong to the selected branch');
  }

  const row = await prisma.taxDeclaration.update({
    where: { id },
    data: {
      taxPercentageGenCus: rates.taxPercentageGenCus,
      ...(rates.taxPercentageOtherShop !== undefined
        ? { taxPercentageOtherShop: rates.taxPercentageOtherShop }
        : {}),
    },
    include: { commodityType: true },
  });
  return serializeSlab(row);
}
