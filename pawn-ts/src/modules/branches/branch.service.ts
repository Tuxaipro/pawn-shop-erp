import { copyInterestSlabs } from '../../lib/interest-slabs.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/errors.js';
import type { z } from 'zod';
import { type createBranchSchema, type updateBranchSchema } from './branch.schema.js';

function serializeBranch(b: {
  id: number;
  code: string;
  name: string;
  address: string;
  landline: string;
  phone: string;
  whatsapp: string;
  isActive: boolean;
}) {
  return {
    id: b.id,
    code: b.code,
    name: b.name,
    address: b.address,
    landline: b.landline,
    phone: b.phone,
    whatsapp: b.whatsapp,
    isActive: b.isActive,
  };
}

export async function listBranches(activeOnly = true) {
  const rows = await prisma.branch.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: 'asc' },
  });
  return rows.map(serializeBranch);
}

export async function createBranch(input: z.infer<typeof createBranchSchema>) {
  const existing = await prisma.branch.findUnique({ where: { code: input.code } });
  if (existing) throw new AppError(409, 'DUPLICATE_CODE', 'Branch code already exists');

  const branch = await prisma.branch.create({
    data: {
      code: input.code,
      name: input.name,
      address: input.address ?? '',
      landline: input.landline ?? '',
      phone: input.phone ?? '',
      whatsapp: input.whatsapp ?? '',
    },
  });

  await copyInterestSlabs(1, branch.id);

  return serializeBranch(branch);
}

export async function updateBranch(id: number, input: z.infer<typeof updateBranchSchema>) {
  const existing = await prisma.branch.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'BRANCH_NOT_FOUND', 'Branch not found');

  const branch = await prisma.branch.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.landline !== undefined ? { landline: input.landline } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.whatsapp !== undefined ? { whatsapp: input.whatsapp } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });

  return serializeBranch(branch);
}
