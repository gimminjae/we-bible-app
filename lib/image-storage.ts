import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import * as Crypto from 'expo-crypto';
import { File as ExpoFile } from 'expo-file-system';

import { getActiveUserId } from '@/lib/auth-state';
import { createS3Client, getPublicS3ObjectUrl, requireAwsS3Config } from '@/lib/aws-s3';
import { createSupabaseClient } from '@/lib/supabase-client';

const IMAGE_INFOS_TABLE = 'image_infos';
const DEFAULT_OBJECT_KEY_PREFIX = 'we-bible';

const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.jfif': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const MIME_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/avif': '.avif',
  'image/bmp': '.bmp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
};

type ImageInfoRow = {
  id?: unknown;
  user_id?: unknown;
  original_name?: unknown;
  stored_name?: unknown;
  object_key?: unknown;
  file_extension?: unknown;
  mime_type?: unknown;
  file_size_bytes?: unknown;
  bucket_name?: unknown;
  region?: unknown;
  url?: unknown;
  etag?: unknown;
  uploaded_at?: unknown;
};

export type ImageUploadSource = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
};

export type UploadImageToS3Input = ImageUploadSource & {
  objectKeyPrefix?: string | null;
  datePathFormat?: 'day' | 'month';
  userId?: string | null;
};

export type UploadedS3Image = {
  id: string;
  originalName: string;
  storedName: string;
  objectKey: string;
  fileExtension: string;
  mimeType: string;
  fileSizeBytes: number;
  bucketName: string;
  region: string;
  url: string;
  etag: string | null;
};

export type SaveImageInfoInput = UploadedS3Image & {
  userId?: string | null;
};

export type ImageInfoRecord = UploadedS3Image & {
  userId: string;
  uploadedAt: string;
};

function toImageStorageError(error: unknown): Error {
  return error instanceof Error ? error : new Error('IMAGE_STORAGE_ERROR');
}

function readTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readFileNameFromUri(uri: string): string | null {
  const candidate = uri.split('/').pop()?.split('?')[0] ?? '';

  if (!candidate) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(candidate).trim();
    return decoded || null;
  } catch {
    return candidate.trim() || null;
  }
}

function getFileExtension(fileName: string): string | null {
  const normalized = fileName.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf('.');

  if (dotIndex <= 0 || dotIndex === normalized.length - 1) {
    return null;
  }

  return normalized.slice(dotIndex);
}

function normalizeMimeType(mimeType?: string | null): string | null {
  const normalized = mimeType?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const [cleanMimeType = ''] = normalized.split(';');
  if (cleanMimeType === 'image/jpg') {
    return 'image/jpeg';
  }

  return cleanMimeType || null;
}

function buildSafeStoredBaseName(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const safeBaseName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return safeBaseName || 'image';
}

function normalizeObjectKeyPrefix(prefix?: string | null): string {
  const normalized = (prefix ?? DEFAULT_OBJECT_KEY_PREFIX)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/');

  return normalized || DEFAULT_OBJECT_KEY_PREFIX;
}

function getUploadDatePath(date = new Date(), format: 'day' | 'month' = 'day'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  if (format === 'month') {
    return `${year}-${month}`;
  }

  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveRequiredUserId(userId?: string | null): string {
  const resolvedUserId = userId?.trim() || getActiveUserId() || '';

  if (!resolvedUserId) {
    throw new Error('AUTH_REQUIRED');
  }

  return resolvedUserId;
}

function normalizeFileSize(fileSize?: number | null): number | null {
  if (typeof fileSize !== 'number' || !Number.isFinite(fileSize) || fileSize < 0) {
    return null;
  }

  return Math.floor(fileSize);
}

function normalizeEtag(etag: string | undefined): string | null {
  const trimmed = etag?.trim() ?? '';
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/^"+|"+$/g, '');
}

function normalizeImageInfoRow(row: ImageInfoRow): ImageInfoRecord {
  return {
    id: String(row.id ?? ''),
    userId: String(row.user_id ?? ''),
    originalName: String(row.original_name ?? ''),
    storedName: String(row.stored_name ?? ''),
    objectKey: String(row.object_key ?? ''),
    fileExtension: String(row.file_extension ?? ''),
    mimeType: String(row.mime_type ?? ''),
    fileSizeBytes: Number(row.file_size_bytes ?? 0),
    bucketName: String(row.bucket_name ?? ''),
    region: String(row.region ?? ''),
    url: String(row.url ?? ''),
    etag: readTrimmedString(row.etag) ?? null,
    uploadedAt: String(row.uploaded_at ?? ''),
  };
}

function resolveImageIdentity(input: ImageUploadSource, imageId: string) {
  const normalizedMimeType = normalizeMimeType(input.mimeType);
  const rawFileName = readTrimmedString(input.fileName) ?? readFileNameFromUri(input.uri) ?? '';
  const extensionFromFileName = rawFileName ? getFileExtension(rawFileName) : null;
  const fileExtension =
    extensionFromFileName ??
    (normalizedMimeType ? MIME_TYPE_TO_EXTENSION[normalizedMimeType] : undefined) ??
    null;
  const mimeType =
    normalizedMimeType ??
    (fileExtension ? EXTENSION_TO_MIME_TYPE[fileExtension] : undefined) ??
    null;

  if (!mimeType || !mimeType.startsWith('image/')) {
    throw new Error('INVALID_IMAGE_TYPE');
  }

  if (!fileExtension) {
    throw new Error('IMAGE_EXTENSION_REQUIRED');
  }

  const originalName = rawFileName || `image-${imageId.slice(0, 8)}${fileExtension}`;
  const storedName = `${imageId}-${buildSafeStoredBaseName(originalName)}${fileExtension}`;

  return {
    originalName,
    storedName,
    fileExtension,
    mimeType,
  };
}

async function deleteUploadedObject(objectKey: string) {
  try {
    const { bucketName } = requireAwsS3Config();
    const s3Client = createS3Client();
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      }),
    );
  } catch (error) {
    console.warn('Failed to rollback uploaded image object.', error);
  }
}

export async function uploadImageToS3(input: UploadImageToS3Input): Promise<UploadedS3Image> {
  const { bucketName, region } = requireAwsS3Config();
  const imageId = Crypto.randomUUID();
  const { originalName, storedName, fileExtension, mimeType } = resolveImageIdentity(
    input,
    imageId,
  );
  const objectKeyPrefix = normalizeObjectKeyPrefix(input.objectKeyPrefix);
  const objectKey = [
    objectKeyPrefix,
    getUploadDatePath(undefined, input.datePathFormat),
    storedName,
  ].join('/');
  const file = new ExpoFile(input.uri);
  const fileBytes = await file.bytes();
  const fileSizeBytes = normalizeFileSize(input.fileSize) ?? fileBytes.byteLength;
  const s3Client = createS3Client();
  const putObjectResult = await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      Body: fileBytes,
      ContentType: mimeType,
      ContentLength: fileSizeBytes,
    }),
  );
  const url = getPublicS3ObjectUrl(objectKey);

  return {
    id: imageId,
    originalName,
    storedName,
    objectKey,
    fileExtension,
    mimeType,
    fileSizeBytes,
    bucketName,
    region,
    url,
    etag: normalizeEtag(putObjectResult.ETag),
  };
}

export async function saveImageInfo(input: SaveImageInfoInput): Promise<ImageInfoRecord> {
  const userId = resolveRequiredUserId(input.userId);
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from(IMAGE_INFOS_TABLE)
    .insert({
      id: input.id,
      user_id: userId,
      original_name: input.originalName,
      stored_name: input.storedName,
      object_key: input.objectKey,
      file_extension: input.fileExtension,
      mime_type: input.mimeType,
      file_size_bytes: input.fileSizeBytes,
      bucket_name: input.bucketName,
      region: input.region,
      url: input.url,
      etag: input.etag,
    })
    .select(
      'id, user_id, original_name, stored_name, object_key, file_extension, mime_type, file_size_bytes, bucket_name, region, url, etag, uploaded_at',
    )
    .single();

  if (error) {
    throw toImageStorageError(error);
  }

  return normalizeImageInfoRow((data ?? {}) as ImageInfoRow);
}

export async function uploadImageAndSave(input: UploadImageToS3Input): Promise<ImageInfoRecord> {
  const userId = resolveRequiredUserId(input.userId);
  const uploadedImage = await uploadImageToS3({
    ...input,
    userId,
  });

  try {
    return await saveImageInfo({
      ...uploadedImage,
      userId,
    });
  } catch (error) {
    await deleteUploadedObject(uploadedImage.objectKey);
    throw toImageStorageError(error);
  }
}
