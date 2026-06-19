import { prisma } from '../../lib/prisma.js';
import { commodityCodeFromNameEn, commodityToId, type CommodityCode } from '../../lib/interest.js';
import { serializeBilingualName } from '../../lib/localized-name.js';

export async function getFormOptions(commodityType?: CommodityCode) {
  const commodityTypeId = commodityType ? commodityToId(commodityType) : undefined;

  const [commodityTypes, subCategories, purities] = await Promise.all([
    prisma.commodityMainCategory.findMany({
      where: { isDeleted: false, status: true },
      orderBy: { id: 'asc' },
    }),
    prisma.commoditySubCategory.findMany({
      where: {
        isDeleted: false,
        status: true,
        ...(commodityTypeId ? { commodityTypeId } : {}),
      },
      orderBy: { nameEn: 'asc' },
    }),
    prisma.purity.findMany({
      where: { id: { in: [1, 2, 3] } },
      orderBy: { id: 'asc' },
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return {
    commodityTypes: commodityTypes.map((c) => ({
      id: c.id,
      code: commodityCodeFromNameEn(c.nameEn),
      ...serializeBilingualName(c),
    })),
    loanConditions: [
      { id: 1, nameEn: 'Personal', nameTn: 'தனிப்பட்ட' },
      { id: 2, nameEn: 'General', nameTn: 'பொது' },
    ],
    customerTypes: [
      { id: 1, nameTn: 'பொது வாடிக்கையாளர்', code: 'general' },
      { id: 2, nameTn: 'மற்ற கடை', code: 'other' },
    ],
    conditionTimeTypes: [
      { id: 1, code: 'week', label: 'வாரம்' },
      { id: 2, code: 'month', label: 'மாதம்' },
      { id: 3, code: 'year', label: 'ஆண்டு' },
      { id: 4, code: 'days', label: 'நாட்கள்' },
    ],
    purities: purities.map((p) => ({
      id: p.id,
      nameTn: p.nameTamil,
      nameEn: p.nameEng,
    })),
    subCategories: subCategories.map((s) => ({
      id: s.id,
      commodityTypeId: s.commodityTypeId,
      ...serializeBilingualName(s),
    })),
    defaultLoanDate: today,
    maxLoanDate: today,
  };
}

export async function listSubCategories(commodityType: CommodityCode) {
  const commodityTypeId = commodityToId(commodityType);
  const rows = await prisma.commoditySubCategory.findMany({
    where: { commodityTypeId, isDeleted: false, status: true },
    orderBy: { nameEn: 'asc' },
  });
  return rows.map((r) => ({
    id: r.id,
    commodityTypeId: r.commodityTypeId,
    ...serializeBilingualName(r),
  }));
}

export async function listSubItems(subCategoryId: number, commodityType: CommodityCode) {
  const commodityTypeId = commodityToId(commodityType);
  const rows = await prisma.commoditySubItem.findMany({
    where: {
      subCategoryId,
      commodityTypeId,
      isDeleted: false,
      status: true,
    },
    orderBy: { nameEn: 'asc' },
  });
  return rows.map((r) => ({
    id: Number(r.id),
    subCategoryId: r.subCategoryId,
    commodityTypeId: r.commodityTypeId,
    ...serializeBilingualName(r),
  }));
}
