import { z } from 'zod';

/** exp_category: 1=income, 2=expense, 3=petty cash, 4=top-up */
export const createEntrySchema = z.object({
  userName: z.string().min(1).max(200),
  description: z.string().min(1).max(250),
  category: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  amount: z.number().positive(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  branchId: z.number().int().positive().optional(),
});

export const listEntriesQuerySchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.coerce.number().int().min(1).max(4).optional(),
  branchId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const openingBalanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  openingBalance: z.number(),
  branchId: z.number().int().positive().optional(),
});

const denominationSchema = z.object({
  denomination: z.number().int().positive(),
  quantity: z.number().int().nonnegative(),
});

export const closeDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  physicalCount: z.number().optional(),
  denominations: z.array(denominationSchema).optional(),
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

export const shopBankDepositSchema = z.object({
  amount: z.number().positive(),
  bankName: z.string().min(1).max(100),
  reference: z.string().max(100).optional(),
  depositDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional(),
  branchId: z.number().int().positive().optional(),
});
