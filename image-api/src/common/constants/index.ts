export const API_PREFIX = 'api/v1';

export const QUEUE_NAMES = {
  IMAGE_FAST_OPS: 'image-fast-ops-queue',
  IMAGE_BG_REMOVE: 'image-bg-remove-queue',
} as const;

export const STORAGE_DIRS = {
  ORIGINALS: 'originals',
  PROCESSED: 'processed',
  TEMP: 'temp',
} as const;

export const SUPPORTED_INPUT_MIMES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/tiff',
  'image/bmp',
  'image/x-ms-bmp',
] as const;

export const SUPPORTED_INPUT_FORMATS = [
  'png',
  'jpeg',
  'jpg',
  'webp',
  'avif',
  'heic',
  'heif',
  'gif',
  'tiff',
  'tif',
  'bmp',
] as const;

export const FALLBACK_EXTENSIONS = [
  'heic',
  'heif',
  'gif',
  'tiff',
  'tif',
  'bmp',
] as const;

export const SHARP_TIMEOUT_MS = 60_000;
