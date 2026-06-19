import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const userRoleSchema = z.enum([
  'SUPER_ADMIN',
  'BRANCH_MANAGER',
  'CASHIER',
  'APPRAISER',
  'ACCOUNTANT',
  'AUDITOR',
]);

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(200),
  role: userRoleSchema,
  branchId: z.number().int().positive().optional().nullable(),
  preferredLanguage: z.enum(['en', 'ta']).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).max(200).optional(),
  role: userRoleSchema.optional(),
  branchId: z.number().int().positive().optional().nullable(),
  preferredLanguage: z.enum(['en', 'ta']).optional(),
});

export const setUserActiveSchema = z.object({
  isActive: z.boolean(),
});
