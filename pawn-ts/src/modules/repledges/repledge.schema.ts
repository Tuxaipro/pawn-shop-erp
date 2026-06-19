import { z } from 'zod';

export const createBankDepositSchema = z.object({
  loanId: z.number().int().positive(),
  customerId: z.number().int().positive().optional(),
  bankName: z.string().min(1).max(200),
  receiptNo: z.string().max(200).optional(),
  depositAmount: z.number().positive(),
  depositDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const settleBankDepositSchema = z.object({
  closingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  securityPin: z.string().min(1),
});

export const batchBankDepositSchema = z.object({
  bankName: z.string().min(1).max(200),
  receiptNo: z.string().max(200).optional(),
  depositDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z
    .array(
      z.object({
        loanId: z.number().int().positive(),
        depositAmount: z.number().positive(),
      })
    )
    .min(1)
    .max(50),
});

export const listBankDepositsQuerySchema = z.object({
  loanId: z.coerce.number().int().positive().optional(),
  isSettled: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
