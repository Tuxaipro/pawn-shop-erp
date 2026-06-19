import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import {
  buildCustomerPhotoKey,
  buildKycKey,
  deleteFile,
  saveFile,
  toPublicUrl,
} from '../../lib/storage.js';
import { AppError } from '../../shared/errors.js';
import { logCustomerActivity } from './customer.activity.js';
import type { CreateCustomerInput, UpdateCustomerInput } from './customer.schema.js';

const CUSTOMER_ID_START = Number(process.env.CUSTOMER_ID_START ?? 1000);

type CustomerRow = Prisma.CustomerGetPayload<{ include: { kycDocuments: true } }>;

function serializeCustomer(row: CustomerRow) {
  const photoUrl = row.photoImage ? toPublicUrl(row.photoImage) : null;
  return {
    id: Number(row.id),
    customerId: Number(row.customerId),
    name: row.name,
    fatherHusbandName: row.fatherHusbandName,
    photoImage: row.photoImage,
    photoUrl,
    address1: row.address1,
    address2: row.address2,
    mobileNo: row.mobileNo,
    whatsappNo: row.whatsappNo,
    email: row.email,
    city: row.city,
    state: row.state,
    country: row.country,
    pinCode: row.pinCode,
    aadhaarNo: row.aadhaarNo,
    panNo: row.panNo,
    occupation: row.occupation,
    nomineeName: row.nomineeName,
    nomineeRelation: row.nomineeRelation,
    nomineeMobile: row.nomineeMobile,
    referenceName: row.referenceName,
    referenceRelation: row.referenceRelation,
    referenceMobile: row.referenceMobile,
    isBlacklisted: row.isBlacklisted,
    blacklistReason: row.blacklistReason,
    blacklistedAt: row.blacklistedAt?.toISOString() ?? null,
    preferredLanguage: row.preferredLanguage,
    isDeleted: row.isDeleted,
    kycDocuments: row.kycDocuments.map((d) => ({
      id: Number(d.id),
      documentType: d.documentType,
      fileName: d.fileName,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      fileUrl: toPublicUrl(d.filePath),
      uploadedOn: d.uploadedOn.toISOString(),
    })),
    createdOn: row.createdOn.toISOString(),
    updatedOn: row.updatedOn.toISOString(),
  };
}

const customerInclude = { kycDocuments: { orderBy: { uploadedOn: 'desc' as const } } };

const TRACKED_FIELDS = [
  'name',
  'fatherHusbandName',
  'mobileNo',
  'whatsappNo',
  'email',
  'address1',
  'city',
  'state',
  'pinCode',
  'aadhaarNo',
  'panNo',
  'occupation',
] as const;

function customerDataFromInput(
  input: CreateCustomerInput | UpdateCustomerInput,
  existing?: { isBlacklisted: boolean; blacklistedAt: Date | null }
) {
  const isBlacklisted = input.isBlacklisted ?? false;
  const blacklistReason = isBlacklisted ? (input.blacklistReason?.trim() ?? '') : '';
  let blacklistedAt: Date | null = null;
  if (isBlacklisted) {
    blacklistedAt =
      existing?.isBlacklisted && existing.blacklistedAt ? existing.blacklistedAt : new Date();
  }

  return {
    name: input.name,
    fatherHusbandName: input.fatherHusbandName,
    address1: input.address1,
    address2: input.address2 ?? '',
    mobileNo: input.mobileNo ?? '',
    whatsappNo: input.whatsappNo ?? '',
    email: input.email ?? '',
    city: input.city ?? '',
    state: input.state ?? '',
    country: input.country ?? 'India',
    pinCode: input.pinCode ?? '',
    aadhaarNo: input.aadhaarNo ?? '',
    panNo: input.panNo ?? '',
    occupation: input.occupation ?? '',
    nomineeName: input.nomineeName ?? '',
    nomineeRelation: input.nomineeRelation ?? '',
    nomineeMobile: input.nomineeMobile ?? '',
    referenceName: input.referenceName ?? '',
    referenceRelation: input.referenceRelation ?? '',
    referenceMobile: input.referenceMobile ?? '',
    isBlacklisted,
    blacklistReason,
    blacklistedAt,
  };
}

function describeFieldChanges(
  existing: Prisma.CustomerGetPayload<object>,
  input: UpdateCustomerInput
): string[] {
  const changes: string[] = [];
  for (const field of TRACKED_FIELDS) {
    const prev = String(existing[field] ?? '');
    const next = String(input[field] ?? '');
    if (prev !== next) changes.push(field);
  }
  return changes;
}

export async function getNextCustomerId(): Promise<number> {
  const agg = await prisma.customer.aggregate({ _max: { customerId: true } });
  const max = agg._max.customerId;
  return max ? Number(max) + 1 : CUSTOMER_ID_START;
}

export async function listCustomers(params: {
  page: number;
  limit: number;
  search?: string;
  mobile?: string;
  blacklisted?: boolean;
}) {
  const where: Prisma.CustomerWhereInput = { isDeleted: false };
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { fatherHusbandName: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  if (params.mobile) where.mobileNo = { contains: params.mobile };
  if (params.blacklisted !== undefined) where.isBlacklisted = params.blacklisted;

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: customerInclude,
      orderBy: { customerId: 'desc' },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    items: items.map(serializeCustomer),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

export async function searchCustomers(q: string, limit: number) {
  const or: Prisma.CustomerWhereInput[] = [
    { name: { contains: q, mode: 'insensitive' } },
    { mobileNo: { contains: q } },
    { fatherHusbandName: { contains: q, mode: 'insensitive' } },
  ];
  if (/^\d+$/.test(q)) {
    or.push({ customerId: BigInt(q) });
  }

  const items = await prisma.customer.findMany({
    where: { isDeleted: false, OR: or },
    take: limit,
    orderBy: { name: 'asc' },
  });

  return items.map((c) => ({
    id: Number(c.id),
    customerId: Number(c.customerId),
    label:
      c.mobileNo !== ''
        ? `${c.name} · ${c.mobileNo} · #${c.customerId}`
        : `${c.name} · #${c.customerId}`,
    name: c.name,
    fatherHusbandName: c.fatherHusbandName,
    mobileNo: c.mobileNo,
    photoUrl: c.photoImage ? toPublicUrl(c.photoImage) : null,
    isBlacklisted: c.isBlacklisted,
  }));
}

export async function getCustomerById(id: number) {
  const row = await prisma.customer.findFirst({
    where: { id: BigInt(id), isDeleted: false },
    include: customerInclude,
  });
  if (!row) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  return serializeCustomer(row);
}

async function assertUniqueCustomerId(customerId: number, excludeId?: bigint) {
  const existing = await prisma.customer.findFirst({
    where: {
      customerId: BigInt(customerId),
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (existing) {
    throw new AppError(409, 'DUPLICATE_CUSTOMER_ID', 'Customer ID already exists');
  }
}

async function assertUniqueMobile(mobile: string, excludeId?: bigint) {
  if (!mobile) return;
  const existing = await prisma.customer.findFirst({
    where: {
      mobileNo: mobile,
      isDeleted: false,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (existing) {
    throw new AppError(409, 'DUPLICATE_MOBILE', 'Mobile number already exists');
  }
}

export async function createCustomer(input: CreateCustomerInput, userId = 1) {
  const customerId = input.customerId ?? (await getNextCustomerId());
  await assertUniqueCustomerId(customerId);
  await assertUniqueMobile(input.mobileNo ?? '');

  const row = await prisma.customer.create({
    data: {
      customerId: BigInt(customerId),
      ...customerDataFromInput(input),
      createdBy: BigInt(userId),
      updatedBy: BigInt(userId),
    },
    include: customerInclude,
  });

  await logCustomerActivity(
    row.id,
    'created',
    `Customer profile created (${row.name})`,
    userId,
    { customerId: Number(row.customerId) }
  );

  if (row.isBlacklisted) {
    await logCustomerActivity(
      row.id,
      'blacklisted',
      `Customer blacklisted: ${row.blacklistReason}`,
      userId,
      { blacklistedAt: row.blacklistedAt?.toISOString() }
    );
  }

  return serializeCustomer(row);
}

export async function updateCustomer(id: number, input: UpdateCustomerInput, userId = 1) {
  const existing = await prisma.customer.findFirst({
    where: { id: BigInt(id), isDeleted: false },
  });
  if (!existing) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');

  await assertUniqueMobile(input.mobileNo ?? '', existing.id);

  const wasBlacklisted = existing.isBlacklisted;
  const data = customerDataFromInput(input, existing);

  const row = await prisma.customer.update({
    where: { id: existing.id },
    data: {
      ...data,
      updatedBy: BigInt(userId),
    },
    include: customerInclude,
  });

  const fieldChanges = describeFieldChanges(existing, input);
  if (fieldChanges.length > 0) {
    await logCustomerActivity(
      existing.id,
      'updated',
      `Profile updated (${fieldChanges.join(', ')})`,
      userId,
      { fields: fieldChanges }
    );
  }

  if (!wasBlacklisted && row.isBlacklisted) {
    await logCustomerActivity(
      existing.id,
      'blacklisted',
      `Customer blacklisted: ${row.blacklistReason}`,
      userId,
      { blacklistedAt: row.blacklistedAt?.toISOString() }
    );
  } else if (wasBlacklisted && !row.isBlacklisted) {
    await logCustomerActivity(existing.id, 'unblacklisted', 'Customer removed from blacklist', userId);
  } else if (
    wasBlacklisted &&
    row.isBlacklisted &&
    existing.blacklistReason !== row.blacklistReason
  ) {
    await logCustomerActivity(
      existing.id,
      'blacklist_updated',
      `Blacklist reason updated: ${row.blacklistReason}`,
      userId
    );
  }

  return serializeCustomer(row);
}

export async function uploadCustomerPhoto(
  id: number,
  file: { buffer: Buffer; mimetype: string; originalname: string },
  userId = 1
) {
  const existing = await prisma.customer.findFirst({
    where: { id: BigInt(id), isDeleted: false },
  });
  if (!existing) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');

  const key = buildCustomerPhotoKey(id, file.mimetype);
  if (existing.photoImage) await deleteFile(existing.photoImage);
  await saveFile(file.buffer, file.mimetype, key);

  const row = await prisma.customer.update({
    where: { id: existing.id },
    data: { photoImage: key, updatedBy: BigInt(userId) },
    include: customerInclude,
  });

  await logCustomerActivity(existing.id, 'photo_uploaded', 'Customer photo uploaded', userId);

  return serializeCustomer(row);
}

export async function uploadKycDocument(
  id: number,
  documentType: string,
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
  userId = 1
) {
  const existing = await prisma.customer.findFirst({
    where: { id: BigInt(id), isDeleted: false },
  });
  if (!existing) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');

  const key = buildKycKey(id, documentType, file.mimetype);
  await saveFile(file.buffer, file.mimetype, key);

  await prisma.customerKycDocument.create({
    data: {
      customerId: existing.id,
      documentType,
      filePath: key,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedBy: BigInt(userId),
    },
  });

  await logCustomerActivity(
    existing.id,
    'kyc_uploaded',
    `KYC document uploaded (${documentType}: ${file.originalname})`,
    userId,
    { documentType, fileName: file.originalname }
  );

  return getCustomerById(id);
}

export async function deleteKycDocument(customerId: number, docId: number, userId = 1) {
  const doc = await prisma.customerKycDocument.findFirst({
    where: { id: BigInt(docId), customerId: BigInt(customerId) },
  });
  if (!doc) throw new AppError(404, 'KYC_NOT_FOUND', 'KYC document not found');

  await deleteFile(doc.filePath);
  await prisma.customerKycDocument.delete({ where: { id: doc.id } });

  await logCustomerActivity(
    BigInt(customerId),
    'kyc_deleted',
    `KYC document deleted (${doc.documentType}: ${doc.fileName})`,
    userId,
    { documentType: doc.documentType, fileName: doc.fileName }
  );

  return getCustomerById(customerId);
}

export async function deleteCustomer(id: number, userId = 1) {
  const existing = await prisma.customer.findFirst({
    where: { id: BigInt(id), isDeleted: false },
    include: { kycDocuments: true },
  });
  if (!existing) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');

  await prisma.customer.update({
    where: { id: existing.id },
    data: { isDeleted: true, updatedBy: BigInt(userId) },
  });

  await logCustomerActivity(existing.id, 'deleted', 'Customer profile deleted', userId);

  return { id: Number(existing.id), deleted: true };
}

export async function getOverdueCustomerAddresses() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await prisma.loan.findMany({
    where: {
      isSettled: 0,
      defaultStatus: false,
      renewalDate: { lte: today },
    },
    distinct: ['customerId'],
    include: {
      customer: {
        select: { name: true, address1: true, mobileNo: true },
      },
    },
  });

  return rows.map((r) => ({
    name: r.customer.name,
    address1: r.customer.address1,
    mobileNo: r.customer.mobileNo,
  }));
}
