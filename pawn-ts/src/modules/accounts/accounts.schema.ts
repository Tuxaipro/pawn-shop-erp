import { z } from 'zod';

/** exp_category: 1=income, 2=expense, 3=petty cash */
export const createEntrySchema = z.object({
  userName: z.string().min(1).max(200),
  description: z.string().min(1).max(250),
  category: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  amount: z.number().positive(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  branchId: z.number().int().positive().optional(),
});

export const listEntriesQuerySchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.coerce.number().int().min(1).max(3).optional(),
  branchId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const openingBalanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  openingBalance: z.number(),
  vaultCash: z.number().nonnegative().optional(),
  counterCash: z.number().nonnegative().optional(),
  branchId: z.number().int().positive().optional(),
});

export const closeDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  closingBalance: z.number(),
  physicalCount: z.number().optional(),
  vaultCash: z.number().nonnegative().optional(),
  counterCash: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
  branchId: z.number().int().positive().optional(),
});

export const cashTransferSchema = z.object({
  toBranchId: z.number().int().positive(),
  amount: z.number().positive(),
  transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(500).optional(),
  branchId: z.number().int().positive().optional(),
});
