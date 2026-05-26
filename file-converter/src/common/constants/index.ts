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
] as const;

export const LIBREOFFICE_DEFAULT_TIMEOUT_MS = 120_000;

export const SHARP_TIMEOUT_MS = 60_000;

/**
 * Whitelisted source → target conversions (MVP).
 * Used by the service to reject unsupported combinations before queuing work.
 */
export const SUPPORTED_CONVERSIONS = [
  // Documents
  { source: 'PDF', target: 'DOCX' },
  { source: 'DOCX', target: 'PDF' },
  { source: 'PPTX', target: 'PDF' },
  { source: 'XLSX', target: 'PDF' },
  { source: 'TXT', target: 'PDF' },
  // Images
  { source: 'PNG', target: 'JPG' },
  { source: 'JPG', target: 'PNG' },
  { source: 'WEBP', target: 'PNG' },
  { source: 'PNG', target: 'WEBP' },
] as const;
