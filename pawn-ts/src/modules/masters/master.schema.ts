import { z } from 'zod';

const bilingualNameBody = (maxEn: number, maxTa: number) =>
  z.object({
    nameEn: z.string().trim().min(1).max(maxEn),
    nameTa: z.string().trim().max(maxTa).optional().default(''),
  });

export const categoryBodySchema = bilingualNameBody(50, 50);
export const categoryUpdateSchema = categoryBodySchema;

export const subCategoryBodySchema = bilingualNameBody(200, 200).extend({
  commodityTypeId: z.coerce.number().int().positive(),
});

export const subCategoryUpdateSchema = bilingualNameBody(200, 200);

export const subItemBodySchema = bilingualNameBody(200, 200).extend({
  commodityTypeId: z.coerce.number().int().positive(),
  subCategoryId: z.coerce.number().int().positive(),
});

export const subItemUpdateSchema = bilingualNameBody(200, 200);

export const slabBodySchema = z.object({
  commodityTypeId: z.coerce.number().int().positive(),
  minAmount: z.coerce.number().int().min(0),
  maxAmount: z.coerce.number().int().positive(),
  taxPercentageGenCus: z.coerce.number().positive().max(100),
  taxPercentageOtherShop: z.coerce.number().positive().max(100),
}).refine((d) => d.minAmount <= d.maxAmount, {
  message: 'Min amount must be less than or equal to max amount',
  path: ['maxAmount'],
});

export const interestRateUpdateSchema = z.object({
  taxPercentageGenCus: z.coerce.number().positive().max(100),
  taxPercentageOtherShop: z.coerce.number().positive().max(100).optional(),
});

export const listSubCategoriesQuery = z.object({
  commodityTypeId: z.coerce.number().int().positive().optional(),
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const listSubItemsQuery = z.object({
  commodityTypeId: z.coerce.number().int().positive().optional(),
  subCategoryId: z.coerce.number().int().positive().optional(),
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const listSlabsQuery = z.object({
  commodityTypeId: z.coerce.number().int().positive(),
});

export const nextMinQuery = z.object({
  commodityTypeId: z.coerce.number().int().positive(),
});

export type BilingualNameInput = { nameEn: string; nameTa?: string };
