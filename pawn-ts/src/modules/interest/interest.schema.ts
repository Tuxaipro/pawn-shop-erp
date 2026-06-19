import { z } from 'zod';

export const loanIdParamSchema = z.object({
  loanId: z.coerce.number().int().positive(),
});

export const createPartPaymentSchema = z.object({
  loanId: z.number().int().positive(),
  amount: z.number().positive(),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const listPartPaymentsQuerySchema = z.object({
  loanId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().trim().optional(),
});

export const partPaymentIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updatePartPaymentSchema = z.object({
  amount: z.number().positive(),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
