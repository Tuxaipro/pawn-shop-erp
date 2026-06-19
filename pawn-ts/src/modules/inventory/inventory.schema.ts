import { z } from 'zod';

export const STOCK_STATUSES = [
  'available',
  'released',
  'auctioned',
  'bank_pledged',
  'renewed',
  'lost',
  'damaged',
  'transferred',
] as const;

export type StockStatus = (typeof STOCK_STATUSES)[number];

export const searchStockQuerySchema = z.object({
  invoiceNo: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  status: z.enum(STOCK_STATUSES).optional(),
  commodityType: z.enum(['gold', 'silver']).optional(),
  subCategoryId: z.coerce.number().int().positive().optional(),
  minWeight: z.coerce.number().nonnegative().optional(),
  maxWeight: z.coerce.number().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
