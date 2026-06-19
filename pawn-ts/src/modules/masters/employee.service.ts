import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/errors.js';

export async function listEmployees(includeInactive = false) {
  const rows = await prisma.employee.findMany({
    where: {
      isDeleted: false,
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      user: { select: { id: true, email: true, role: true } },
    },
    orderBy: { name: 'asc' },
  });
  return rows.map((e) => ({
    id: e.id,
    employeeCode: e.employeeCode,
    name: e.name,
    mobile: e.mobile,
    email: e.email,
    designation: e.designation,
    branchId: e.branchId,
    branchName: e.branch?.name ?? null,
    userId: e.userId,
    userEmail: e.user?.email ?? null,
    userRole: e.user?.role ?? null,
    joiningDate: e.joiningDate?.toISOString().slice(0, 10) ?? null,
    isActive: e.isActive,
  }));
}

export async function createEmployee(input: {
  employeeCode: string;
  name: string;
  mobile?: string;
  email?: string;
  designation?: string;
  branchId?: number | null;
  userId?: number | null;
  joiningDate?: string | null;
}) {
  const existing = await prisma.employee.findUnique({
    where: { employeeCode: input.employeeCode.toUpperCase() },
  });
  if (existing && !existing.isDeleted) {
    throw new AppError(409, 'DUPLICATE_CODE', 'Employee code already exists');
  }

  if (input.userId) {
    const linked = await prisma.employee.findFirst({
      where: { userId: input.userId, isDeleted: false },
    });
    if (linked) throw new AppError(409, 'USER_LINKED', 'User already linked to another employee');
  }

  const row = await prisma.employee.create({
    data: {
      employeeCode: input.employeeCode.toUpperCase(),
      name: input.name.trim(),
      mobile: input.mobile?.trim() ?? '',
      email: input.email?.trim().toLowerCase() ?? '',
      designation: input.designation?.trim() ?? '',
      branchId: input.branchId ?? null,
      userId: input.userId ?? null,
      joiningDate: input.joiningDate ? new Date(input.joiningDate) : null,
    },
  });
  return { id: row.id };
}

export async function updateEmployee(
  id: number,
  input: {
    name?: string;
    mobile?: string;
    email?: string;
    designation?: string;
    branchId?: number | null;
    userId?: number | null;
    joiningDate?: string | null;
  }
) {
  const row = await prisma.employee.findFirst({ where: { id, isDeleted: false } });
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Employee not found');

  if (input.userId !== undefined && input.userId !== null) {
    const linked = await prisma.employee.findFirst({
      where: { userId: input.userId, isDeleted: false, NOT: { id } },
    });
    if (linked) throw new AppError(409, 'USER_LINKED', 'User already linked to another employee');
  }

  await prisma.employee.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.mobile !== undefined ? { mobile: input.mobile.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      ...(input.designation !== undefined ? { designation: input.designation.trim() } : {}),
      ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
      ...(input.joiningDate !== undefined
        ? { joiningDate: input.joiningDate ? new Date(input.joiningDate) : null }
        : {}),
    },
  });
  return { id };
}

export async function toggleEmployeeStatus(id: number) {
  const row = await prisma.employee.findFirst({ where: { id, isDeleted: false } });
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Employee not found');
  const updated = await prisma.employee.update({
    where: { id },
    data: { isActive: !row.isActive },
  });
  return { id: updated.id, isActive: updated.isActive };
}

export async function deleteEmployee(id: number) {
  const row = await prisma.employee.findFirst({ where: { id, isDeleted: false } });
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Employee not found');
  await prisma.employee.update({
    where: { id },
    data: { isDeleted: true, isActive: false, userId: null },
  });
  return { id };
}
