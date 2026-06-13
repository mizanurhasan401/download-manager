import { createHash } from 'crypto';
import { ConversionFileFormat } from '@prisma/client';
import { isRasterImageFormat } from '../constants';

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

export function getExtensionForFormat(format: ConversionFileFormat): string {
  switch (format) {
    case ConversionFileFormat.PDF:
      return 'pdf';
    case ConversionFileFormat.DOCX:
      return 'docx';
    case ConversionFileFormat.PPTX:
      return 'pptx';
    case ConversionFileFormat.XLSX:
      return 'xlsx';
    case ConversionFileFormat.TXT:
      return 'txt';
    case ConversionFileFormat.PNG:
      return 'png';
    case ConversionFileFormat.JPG:
      return 'jpg';
    case ConversionFileFormat.WEBP:
      return 'webp';
    case ConversionFileFormat.HEIC:
      return 'heic';
    case ConversionFileFormat.GIF:
      return 'gif';
    case ConversionFileFormat.TIFF:
      return 'tiff';
    case ConversionFileFormat.BMP:
      return 'bmp';
    default:
      return 'bin';
  }
}

export function getMimeForFormat(format: ConversionFileFormat): string {
  switch (format) {
    case ConversionFileFormat.PDF:
      return 'application/pdf';
    case ConversionFileFormat.DOCX:
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case ConversionFileFormat.PPTX:
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case ConversionFileFormat.XLSX:
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case ConversionFileFormat.TXT:
      return 'text/plain';
    case ConversionFileFormat.PNG:
      return 'image/png';
    case ConversionFileFormat.JPG:
      return 'image/jpeg';
    case ConversionFileFormat.WEBP:
      return 'image/webp';
    case ConversionFileFormat.HEIC:
      return 'image/heic';
    case ConversionFileFormat.GIF:
      return 'image/gif';
    case ConversionFileFormat.TIFF:
      return 'image/tiff';
    case ConversionFileFormat.BMP:
      return 'image/bmp';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Map a detected MIME (from file-type or Multer) to our ConversionFileFormat enum.
 * Returns null when the type is not supported.
 */
export function mimeToFormat(mime: string): ConversionFileFormat | null {
  switch (mime) {
    case 'application/pdf':
      return ConversionFileFormat.PDF;
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return ConversionFileFormat.DOCX;
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return ConversionFileFormat.PPTX;
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return ConversionFileFormat.XLSX;
    case 'text/plain':
      return ConversionFileFormat.TXT;
    case 'image/png':
      return ConversionFileFormat.PNG;
    case 'image/jpeg':
    case 'image/jpg':
      return ConversionFileFormat.JPG;
    case 'image/webp':
      return ConversionFileFormat.WEBP;
    case 'image/heic':
    case 'image/heif':
      return ConversionFileFormat.HEIC;
    case 'image/gif':
      return ConversionFileFormat.GIF;
    case 'image/tiff':
      return ConversionFileFormat.TIFF;
    case 'image/bmp':
    case 'image/x-ms-bmp':
      return ConversionFileFormat.BMP;
    default:
      return null;
  }
}

/**
 * Best-effort format inference from a filename extension (lowercase).
 * Used as a fallback when `file-type` magic-byte detection fails (e.g. for
 * plain text files which do not carry a magic signature).
 */
export function extensionToFormat(
  fileName: string,
): ConversionFileFormat | null {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'pdf':
      return ConversionFileFormat.PDF;
    case 'docx':
      return ConversionFileFormat.DOCX;
    case 'pptx':
      return ConversionFileFormat.PPTX;
    case 'xlsx':
      return ConversionFileFormat.XLSX;
    case 'txt':
      return ConversionFileFormat.TXT;
    case 'png':
      return ConversionFileFormat.PNG;
    case 'jpg':
    case 'jpeg':
      return ConversionFileFormat.JPG;
    case 'webp':
      return ConversionFileFormat.WEBP;
    case 'heic':
    case 'heif':
      return ConversionFileFormat.HEIC;
    case 'gif':
      return ConversionFileFormat.GIF;
    case 'tiff':
    case 'tif':
      return ConversionFileFormat.TIFF;
    case 'bmp':
      return ConversionFileFormat.BMP;
    default:
      return null;
  }
}

export function isImageFormat(format: ConversionFileFormat): boolean {
  return isRasterImageFormat(format);
}
