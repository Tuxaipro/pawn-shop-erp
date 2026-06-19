import { z } from 'zod';

const optionalStr = (max: number) => z.string().trim().max(max).optional().default('');
const aadhaarRegex = /^\d{12}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const customerFieldsBase = z.object({
  name: z.string().trim().min(1).max(200),
  fatherHusbandName: z.string().trim().min(1).max(200),
  address1: z.string().trim().min(1).max(250),
  address2: optionalStr(250),
  mobileNo: optionalStr(30),
  whatsappNo: optionalStr(30),
  email: z.union([z.literal(''), z.string().trim().email().max(200)]).optional().default(''),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().min(1, 'State is required').max(60),
  country: optionalStr(100).default('India'),
  pinCode: z.string().trim().min(1, 'Postal code is required').max(10),
  aadhaarNo: z
    .union([z.literal(''), z.string().trim().regex(aadhaarRegex, 'Aadhaar must be 12 digits')])
    .optional()
    .default(''),
  panNo: z
    .union([
      z.literal(''),
      z.string().trim().toUpperCase().regex(panRegex, 'Invalid PAN format'),
    ])
    .optional()
    .default(''),
  occupation: optionalStr(200),
  nomineeName: optionalStr(200),
  nomineeRelation: optionalStr(100),
  nomineeMobile: optionalStr(30),
  referenceName: optionalStr(200),
  referenceRelation: optionalStr(100),
  referenceMobile: optionalStr(30),
  isBlacklisted: z.boolean().optional().default(false),
  blacklistReason: optionalStr(500),
});

function validateBlacklistReason<T extends { isBlacklisted?: boolean; blacklistReason?: string }>(
  data: T,
  ctx: z.RefinementCtx
) {
  if (data.isBlacklisted && !data.blacklistReason?.trim()) {
    ctx.addIssue({
      code: 'custom',
      path: ['blacklistReason'],
      message: 'Blacklist reason is required',
    });
  }
}

export const customerFieldsSchema = customerFieldsBase.superRefine(validateBlacklistReason);

export const createCustomerSchema = customerFieldsBase
  .extend({
    customerId: z.coerce.number().int().positive().optional(),
  })
  .superRefine(validateBlacklistReason);

export const updateCustomerSchema = customerFieldsBase.superRefine(validateBlacklistReason);

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().optional(),
  mobile: z.string().trim().optional(),
  blacklisted: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const searchCustomersQuerySchema = z.object({
  q: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

export const kycDocumentTypeSchema = z.enum([
  'aadhaar',
  'pan',
  'address_proof',
  'photo_id',
  'other',
]);

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
