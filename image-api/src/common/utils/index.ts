import { createHash } from 'crypto';
import { SUPPORTED_INPUT_MIMES } from '../constants';

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 200);
}

export function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function serializeBigInt<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) =>
      typeof val === 'bigint' ? val.toString() : val,
    ),
  ) as T;
}

export function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}

export function inferExtensionFromFormat(format: string): string {
  switch (format.toLowerCase()) {
    case 'jpeg':
    case 'jpg':
      return 'jpg';
    case 'png':
      return 'png';
    case 'webp':
      return 'webp';
    case 'avif':
      return 'avif';
    case 'heic':
    case 'heif':
      return 'heic';
    case 'gif':
      return 'gif';
    case 'tiff':
    case 'tif':
      return 'tiff';
    case 'bmp':
      return 'bmp';
    default:
      return 'bin';
  }
}

export function inferMimeFromFormat(format: string): string {
  switch (format.toLowerCase()) {
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    case 'heic':
    case 'heif':
      return 'image/heic';
    case 'gif':
      return 'image/gif';
    case 'tiff':
    case 'tif':
      return 'image/tiff';
    case 'bmp':
      return 'image/bmp';
    default:
      return 'application/octet-stream';
  }
}

export function isHeicExtension(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return ext === 'heic' || ext === 'heif';
}

export function isFallbackExtension(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return (
    ext === 'heic' ||
    ext === 'heif' ||
    ext === 'gif' ||
    ext === 'tiff' ||
    ext === 'tif' ||
    ext === 'bmp'
  );
}

export function isSupportedInputMime(mime: string): boolean {
  return (SUPPORTED_INPUT_MIMES as readonly string[]).includes(mime);
}

export function inferUploadMime(fileName: string, mimeType: string): string {
  if (isSupportedInputMime(mimeType)) {
    return mimeType;
  }
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'heic':
    case 'heif':
      return 'image/heic';
    case 'gif':
      return 'image/gif';
    case 'tiff':
    case 'tif':
      return 'image/tiff';
    case 'bmp':
      return 'image/bmp';
    default:
      return mimeType;
  }
}
