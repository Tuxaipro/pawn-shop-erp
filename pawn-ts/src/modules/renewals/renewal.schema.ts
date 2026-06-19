import { z } from 'zod';

export const closeLoanSchema = z.object({
  settledAmount: z.number().nonnegative(),
  loanSettledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  interestDisAmt: z.number().nonnegative().optional(),
  securityPin: z.string().min(1),
});

export const renewLoanSchema = z.object({
  newInvoiceNo: z.number().int().positive(),
  newLoanAmount: z.number().positive(),
  loanAmountWords: z.string().min(1),
  loanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  interestDisAmt: z.number().nonnegative().optional(),
  securityPin: z.string().min(1),
});

export const markDefaultSchema = z.object({
  defaultStatus: z.boolean(),
});
