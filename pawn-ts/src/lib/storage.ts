import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { AppError } from '../shared/errors.js';

export type StorageDriver = 'local' | 's3';

const DRIVER = (process.env.STORAGE_DRIVER ?? 'local') as StorageDriver;
const LOCAL_ROOT = path.resolve(process.env.STORAGE_LOCAL_PATH ?? './storage');
const PUBLIC_BASE = process.env.STORAGE_PUBLIC_BASE_URL ?? '/api/v1/files';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const MAX_BYTES = Number(process.env.STORAGE_MAX_FILE_BYTES ?? 5 * 1024 * 1024);

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION ?? 'ap-south-1',
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }
  return s3Client;
}

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'application/pdf') return '.pdf';
  return '';
}

export function validateUpload(file: { mimetype: string; size: number }) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new AppError(422, 'INVALID_FILE_TYPE', 'Only JPEG, PNG, WebP, and PDF files are allowed');
  }
  if (file.size > MAX_BYTES) {
    throw new AppError(422, 'FILE_TOO_LARGE', `File must be under ${MAX_BYTES / 1024 / 1024}MB`);
  }
}

export function getStorageDriver(): StorageDriver {
  return DRIVER;
}

export function toPublicUrl(storageKey: string): string {
  if (DRIVER === 's3') {
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION ?? 'ap-south-1';
    if (process.env.AWS_S3_PUBLIC_URL) {
      return `${process.env.AWS_S3_PUBLIC_URL.replace(/\/$/, '')}/${storageKey}`;
    }
    return `https://${bucket}.s3.${region}.amazonaws.com/${storageKey}`;
  }
  return `${PUBLIC_BASE}/${storageKey.replace(/\\/g, '/')}`;
}

export async function saveFile(
  buffer: Buffer,
  mimeType: string,
  storageKey: string
): Promise<string> {
  validateUpload({ mimetype: mimeType, size: buffer.length });

  if (DRIVER === 's3') {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      throw new AppError(500, 'S3_NOT_CONFIGURED', 'AWS_S3_BUCKET is required for S3 storage');
    }
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
      })
    );
    return storageKey;
  }

  const fullPath = path.join(LOCAL_ROOT, storageKey);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
  return storageKey;
}

export async function deleteFile(storageKey: string): Promise<void> {
  if (!storageKey) return;

  if (DRIVER === 's3') {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) return;
    await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }));
    return;
  }

  const fullPath = path.join(LOCAL_ROOT, storageKey);
  try {
    await unlink(fullPath);
  } catch {
    // file may already be gone
  }
}

export function buildCustomerPhotoKey(customerId: number, mimeType: string): string {
  return `customers/${customerId}/photo${extFromMime(mimeType)}`;
}

export function buildKycKey(customerId: number, documentType: string, mimeType: string): string {
  const safeType = documentType.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  return `customers/${customerId}/kyc/${safeType}-${randomUUID()}${extFromMime(mimeType)}`;
}

export function getLocalStorageRoot(): string {
  return LOCAL_ROOT;
}
