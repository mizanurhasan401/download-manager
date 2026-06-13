export const API_PREFIX = 'api/v1';

export const QUEUE_NAMES = {
  IMAGE_CONVERT: 'file-image-convert-queue',
  DOCUMENT_CONVERT: 'file-document-convert-queue',
} as const;

export const STORAGE_DIRS = {
  UPLOADS: 'uploads',
  CONVERTED: 'converted',
  TEMP: 'temp',
} as const;

export const SUPPORTED_INPUT_MIMES = [
  // Documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'text/plain',
  // Images
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/tiff',
  'image/bmp',
  'image/x-ms-bmp',
] as const;

export const RASTER_IMAGE_FORMATS = [
  'PNG',
  'JPG',
  'WEBP',
  'HEIC',
  'GIF',
  'TIFF',
  'BMP',
] as const;

/** Formats Sharp can encode on this stack (BMP is input-only). */
export const RASTER_IMAGE_OUTPUT_FORMATS = [
  'PNG',
  'JPG',
  'WEBP',
  'HEIC',
  'GIF',
  'TIFF',
] as const;

export type RasterImageFormat = (typeof RASTER_IMAGE_FORMATS)[number];

export function isRasterImageFormat(format: string): format is RasterImageFormat {
  return (RASTER_IMAGE_FORMATS as readonly string[]).includes(format);
}

export function isSupportedImageConversion(
  source: string,
  target: string,
): boolean {
  return (
    isRasterImageFormat(source) &&
    (RASTER_IMAGE_OUTPUT_FORMATS as readonly string[]).includes(target) &&
    source !== target
  );
}

export const LIBREOFFICE_DEFAULT_TIMEOUT_MS = 120_000;

export const SHARP_TIMEOUT_MS = 60_000;

/**
 * Document-only conversion pairs. Raster image conversions are validated
 * programmatically via `isSupportedImageConversion`.
 */
export const SUPPORTED_CONVERSIONS = [
  { source: 'PDF', target: 'DOCX' },
  { source: 'DOCX', target: 'PDF' },
  { source: 'PPTX', target: 'PDF' },
  { source: 'XLSX', target: 'PDF' },
  { source: 'TXT', target: 'PDF' },
] as const;
