import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export async function logCustomerActivity(
  customerId: bigint,
  action: string,
  description: string,
  userId?: number,
  metadata?: Record<string, unknown>
) {
  await prisma.customerActivity.create({
    data: {
      customerId,
      action,
      description,
      performedBy: userId,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function listCustomerActivities(customerId: number, limit = 50) {
  const rows = await prisma.customerActivity.findMany({
    where: { customerId: BigInt(customerId) },
    orderBy: { createdOn: 'desc' },
    take: limit,
  });

  return rows.map((r) => ({
    id: Number(r.id),
    action: r.action,
    description: r.description,
    metadata: r.metadata,
    performedBy: r.performedBy,
    createdOn: r.createdOn.toISOString(),
  }));
}
