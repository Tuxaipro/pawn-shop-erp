import { prisma } from './prisma.js';

export async function logAudit(
  userId: number,
  action: string,
  entity: string,
  entityId?: string,
  details?: unknown
) {
  await prisma.auditLog.create({
    data: { userId, action, entity, entityId, details: details as object },
  });
}

export async function listAuditLogs(params: {
  page?: number;
  limit?: number;
  userId?: number;
  entity?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 50, 200);
  const skip = (page - 1) * limit;

  const where: {
    userId?: number;
    entity?: string;
    createdOn?: { gte?: Date; lte?: Date };
  } = {};

  if (params.userId) where.userId = params.userId;
  if (params.entity) where.entity = params.entity;
  if (params.fromDate || params.toDate) {
    where.createdOn = {};
    if (params.fromDate) where.createdOn.gte = new Date(params.fromDate);
    if (params.toDate) {
      const end = new Date(params.toDate);
      end.setHours(23, 59, 59, 999);
      where.createdOn.lte = end;
    }
  }

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdOn: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id.toString(),
      userId: r.userId,
      userName: r.user.name,
      userEmail: r.user.email,
      userRole: r.user.role,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      details: r.details,
      createdOn: r.createdOn.toISOString(),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
