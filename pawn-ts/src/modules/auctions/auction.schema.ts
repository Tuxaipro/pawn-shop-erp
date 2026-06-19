import { z } from 'zod';

export const createAuctionNoticeSchema = z.object({
  loanId: z.number().int().positive(),
  noticeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  auctionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const updateAuctionNoticeSchema = z.object({
  auctionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['pending', 'notified', 'sold', 'completed', 'cancelled']).optional(),
  legalNoticeSent: z.boolean().optional(),
  advertisementSent: z.boolean().optional(),
});

export const recordSaleSchema = z.object({
  saleAmount: z.number().positive(),
  buyerName: z.string().min(1),
  auctionCharges: z.number().nonnegative().optional(),
  penaltyAmount: z.number().nonnegative().optional(),
});

export const listAuctionsQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
