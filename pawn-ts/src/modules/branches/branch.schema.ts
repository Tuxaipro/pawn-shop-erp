import { z } from 'zod';

export const branchProfileSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().max(250).optional(),
  landline: z.string().max(30).optional(),
  phone: z.string().max(20).optional(),
  whatsapp: z.string().max(20).optional(),
});

export const createBranchSchema = branchProfileSchema.extend({
  code: z.string().min(1).max(20),
});

export const updateBranchSchema = branchProfileSchema.partial().extend({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});
