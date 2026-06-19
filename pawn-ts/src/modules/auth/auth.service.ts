import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { signToken } from '../../lib/jwt.js';
import { logAudit } from '../../lib/audit.service.js';
import { getRolePermissionsMatrix, ALL_PERMISSIONS } from '../../lib/rbac.js';
import { AppError } from '../../shared/errors.js';
import { getSessionTimeoutMinutes } from '../settings/organization.service.js';
import type { createUserSchema, updateUserSchema } from './auth.schema.js';
import type { z } from 'zod';

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  const sessionMinutes = await getSessionTimeoutMinutes();
  const token = signToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      name: user.name,
    },
    `${sessionMinutes}m`
  );

  await logAudit(user.id, 'LOGIN', 'auth', String(user.id));

  return {
    token,
    sessionTimeoutMinutes: sessionMinutes,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
      preferredLanguage: user.preferredLanguage,
    },
  };
}

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { branch: { select: { id: true, code: true, name: true } } },
  });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  const sessionTimeoutMinutes = await getSessionTimeoutMinutes();
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    branchId: user.branchId,
    branch: user.branch,
    preferredLanguage: user.preferredLanguage,
    isActive: user.isActive,
    sessionTimeoutMinutes,
  };
}

export async function createUser(
  input: z.infer<typeof createUserSchema>,
  actorId: number
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw new AppError(409, 'DUPLICATE_EMAIL', 'Email already registered');

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
      role: input.role,
      branchId: input.branchId ?? null,
      preferredLanguage: input.preferredLanguage ?? 'en',
    },
  });

  await logAudit(actorId, 'CREATE', 'user', String(user.id), {
    email: user.email,
    role: user.role,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    branchId: user.branchId,
    isActive: user.isActive,
  };
}

export async function updateUser(
  id: number,
  input: z.infer<typeof updateUserSchema>,
  actorId: number
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

  if (input.email && input.email.toLowerCase() !== user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) throw new AppError(409, 'DUPLICATE_EMAIL', 'Email already registered');
  }

  const data: {
    email?: string;
    name?: string;
    role?: typeof user.role;
    branchId?: number | null;
    preferredLanguage?: string;
    passwordHash?: string;
  } = {};

  if (input.email) data.email = input.email.toLowerCase();
  if (input.name) data.name = input.name;
  if (input.role) data.role = input.role;
  if (input.branchId !== undefined) data.branchId = input.branchId;
  if (input.preferredLanguage) data.preferredLanguage = input.preferredLanguage;
  if (input.password) data.passwordHash = await bcrypt.hash(input.password, 10);

  const updated = await prisma.user.update({ where: { id }, data });

  await logAudit(actorId, 'UPDATE', 'user', String(id), {
    email: updated.email,
    role: updated.role,
  });

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    branchId: updated.branchId,
    isActive: updated.isActive,
  };
}

export async function setUserActive(id: number, isActive: boolean, actorId: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  if (user.id === actorId && !isActive) {
    throw new AppError(400, 'SELF_DEACTIVATE', 'Cannot deactivate your own account');
  }

  const updated = await prisma.user.update({ where: { id }, data: { isActive } });
  await logAudit(actorId, isActive ? 'ACTIVATE' : 'DEACTIVATE', 'user', String(id));

  return {
    id: updated.id,
    isActive: updated.isActive,
  };
}

export async function listUsers() {
  const rows = await prisma.user.findMany({
    include: { branch: { select: { name: true, code: true } } },
    orderBy: { name: 'asc' },
  });
  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    branchId: u.branchId,
    branchName: u.branch?.name ?? null,
    isActive: u.isActive,
    preferredLanguage: u.preferredLanguage,
    createdOn: u.createdOn.toISOString(),
  }));
}

export function listRoles() {
  return {
    roles: getRolePermissionsMatrix(),
    permissions: ALL_PERMISSIONS,
  };
}
