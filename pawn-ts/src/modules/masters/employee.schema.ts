import { z } from 'zod';

export const employeeBodySchema = z.object({
  employeeCode: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  mobile: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  designation: z.string().max(100).optional(),
  branchId: z.number().int().positive().nullable().optional(),
  userId: z.number().int().positive().nullable().optional(),
  joiningDate: z.string().optional().nullable(),
});

export const employeeUpdateSchema = employeeBodySchema
  .omit({ employeeCode: true })
  .partial();
