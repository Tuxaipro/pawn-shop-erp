import { z } from 'zod';

const commodityType = z.enum(['gold', 'silver']);
const loanCondition = z.enum(['general', 'personal']);
const loanCustomerType = z.enum(['general', 'other']);

export const GOLD_PURITY_IDS = [1, 2, 3] as const;
export const SILVER_PURITY_ID = 4;

export const loanItemSchema = z.object({
  subCategoryId: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive(),
  purityId: z.coerce.number().int().min(0).max(4),
  noOfItems: z.coerce.number().int().positive(),
  netWeight: z.coerce.number().positive(),
});

function refineLoanItems(
  data: { commodityType: z.infer<typeof commodityType>; items: { purityId: number }[] },
  ctx: z.RefinementCtx
) {
  data.items.forEach((item, index) => {
    if (data.commodityType === 'gold' && !GOLD_PURITY_IDS.includes(item.purityId as (typeof GOLD_PURITY_IDS)[number])) {
      ctx.addIssue({
        code: 'custom',
        path: ['items', index, 'purityId'],
        message: 'Purity must be KDM 916, Ordinary, or Hallmark for gold loans',
      });
    }
  });
}

export const createLoanSchema = z
  .object({
    customerId: z.coerce.number().int().positive(),
    invoiceNo: z.coerce.number().int().positive(),
    loanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    commodityType: commodityType,
    loanCondition: loanCondition,
    loanConditionDeadlineMonth: z.coerce.number().int().positive().optional().nullable(),
    conditionTimeType: z.coerce.number().int().min(1).max(4).optional().nullable(),
    loanCustomerType: loanCustomerType,
    loanAmount: z.coerce.number().positive(),
    loanAmountWords: z.string().trim().min(1).max(150),
    items: z.array(loanItemSchema).min(1),
  })
  .superRefine((data, ctx) => {
    refineLoanItems(data, ctx);
    if (data.loanCondition === 'personal') {
      if (!data.loanConditionDeadlineMonth) {
        ctx.addIssue({
          code: 'custom',
          path: ['loanConditionDeadlineMonth'],
          message: 'Required for personal loan condition',
        });
      }
      if (!data.conditionTimeType) {
        ctx.addIssue({
          code: 'custom',
          path: ['conditionTimeType'],
          message: 'Required for personal loan condition',
        });
      }
    }
  });

export const updateLoanSchema = z
  .object({
    securityPin: z.string().min(1),
    invoiceNo: z.coerce.number().int().positive(),
    commodityType: commodityType,
    loanCondition: loanCondition,
    loanConditionDeadlineMonth: z.coerce.number().int().positive().optional().nullable(),
    conditionTimeType: z.coerce.number().int().min(1).max(4).optional().nullable(),
    loanCustomerType: loanCustomerType,
    loanAmount: z.coerce.number().positive(),
    interest: z.coerce.number().positive(),
    loanAmountWords: z.string().trim().min(1).max(150),
    items: z.array(loanItemSchema).min(1),
  })
  .superRefine((data, ctx) => {
    refineLoanItems(data, ctx);
    if (data.loanCondition === 'personal') {
      if (!data.loanConditionDeadlineMonth) {
        ctx.addIssue({
          code: 'custom',
          path: ['loanConditionDeadlineMonth'],
          message: 'Required for personal loan condition',
        });
      }
      if (!data.conditionTimeType) {
        ctx.addIssue({
          code: 'custom',
          path: ['conditionTimeType'],
          message: 'Required for personal loan condition',
        });
      }
    }
  });

export const deleteLoanSchema = z.object({
  securityPin: z.string().min(1),
  reason: z.string().trim().optional(),
});

export const listLoansQuerySchema = z.object({
  settlementStatus: z.coerce.number().int().min(0).max(2).default(0),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  search: z.string().trim().optional(),
  fatherHusbandName: z.string().trim().optional(),
  invoiceNo: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const calculateInterestQuerySchema = z.object({
  loanAmount: z.coerce.number().positive(),
  commodityType: commodityType,
  loanCustomerType: loanCustomerType,
});

export const checkInvoiceQuerySchema = z.object({
  excludeLoanId: z.coerce.number().int().positive().optional(),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>;
export type LoanItemInput = z.infer<typeof loanItemSchema>;
