import type {
  ConversionFileFormat,
  CreateConversionBody,
} from '@/types/file-converter';

export type SourceCategory = 'document' | 'image';

export interface ConversionOption {
  source: ConversionFileFormat;
  target: CreateConversionBody['targetFormat'];
  label: string;
  category: SourceCategory;
  mimes: string[];
  extensions: string[];
}

export const RASTER_IMAGE_TARGETS: ConversionFileFormat[] = [
  'PNG',
  'JPG',
  'WEBP',
  'HEIC',
  'GIF',
  'TIFF',
];

export const RASTER_IMAGE_SOURCES: Array<{
  source: ConversionFileFormat;
  mimes: string[];
  extensions: string[];
}> = [
  { source: 'PNG', mimes: ['image/png'], extensions: ['png'] },
  { source: 'JPG', mimes: ['image/jpeg'], extensions: ['jpg', 'jpeg'] },
  { source: 'WEBP', mimes: ['image/webp'], extensions: ['webp'] },
  {
    source: 'HEIC',
    mimes: ['image/heic', 'image/heif'],
    extensions: ['heic', 'heif'],
  },
  { source: 'GIF', mimes: ['image/gif'], extensions: ['gif'] },
  { source: 'TIFF', mimes: ['image/tiff'], extensions: ['tiff', 'tif'] },
  {
    source: 'BMP',
    mimes: ['image/bmp', 'image/x-ms-bmp'],
    extensions: ['bmp'],
  },
];

/** Document-only pairs (mirrors backend SUPPORTED_CONVERSIONS). */
export const DOCUMENT_CONVERSION_MATRIX: readonly ConversionOption[] = [
  {
    source: 'PDF',
    target: 'DOCX',
    label: 'PDF → DOCX (Word)',
    category: 'document',
    mimes: ['application/pdf'],
    extensions: ['pdf'],
  },
  {
    source: 'DOCX',
    target: 'PDF',
    label: 'DOCX → PDF',
    category: 'document',
    mimes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    extensions: ['docx'],
  },
  {
    source: 'PPTX',
    target: 'PDF',
    label: 'PPTX → PDF',
    category: 'document',
    mimes: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    extensions: ['pptx'],
  },
  {
    source: 'XLSX',
    target: 'PDF',
    label: 'XLSX → PDF',
    category: 'document',
    mimes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    extensions: ['xlsx'],
  },
  {
    source: 'TXT',
    target: 'PDF',
    label: 'TXT → PDF',
    category: 'document',
    mimes: ['text/plain'],
    extensions: ['txt'],
  },
] as const;

function findRasterSource(source: ConversionFileFormat) {
  return RASTER_IMAGE_SOURCES.find((entry) => entry.source === source);
}

function buildRasterTargetOptions(
  source: ConversionFileFormat,
): ConversionOption[] {
  const meta = findRasterSource(source);
  if (!meta) return [];

  return RASTER_IMAGE_TARGETS.filter((target) => target !== source).map(
    (target) => ({
      source,
      target: target as CreateConversionBody['targetFormat'],
      label: `${source} → ${target}`,
      category: 'image' as const,
      mimes: meta.mimes,
      extensions: meta.extensions,
    }),
  );
}

export const ALL_ACCEPTED_MIMES = Array.from(
  new Set([
    ...DOCUMENT_CONVERSION_MATRIX.flatMap((opt) => opt.mimes),
    ...RASTER_IMAGE_SOURCES.flatMap((opt) => opt.mimes),
  ]),
).join(',');

export const ALL_ACCEPTED_EXTENSIONS = Array.from(
  new Set([
    ...DOCUMENT_CONVERSION_MATRIX.flatMap((opt) => opt.extensions),
    ...RASTER_IMAGE_SOURCES.flatMap((opt) => opt.extensions),
  ]),
);

export function detectSourceFormat(file: File): ConversionFileFormat | null {
  for (const entry of RASTER_IMAGE_SOURCES) {
    if (entry.mimes.includes(file.type)) {
      return entry.source;
    }
  }

  for (const opt of DOCUMENT_CONVERSION_MATRIX) {
    if (opt.mimes.includes(file.type)) {
      return opt.source;
    }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  const rasterByExt = RASTER_IMAGE_SOURCES.find((entry) =>
    entry.extensions.includes(ext),
  );
  if (rasterByExt) return rasterByExt.source;

  const docByExt = DOCUMENT_CONVERSION_MATRIX.find((opt) =>
    opt.extensions.includes(ext),
  );
  return docByExt?.source ?? null;
}

export function getAvailableTargets(
  source: ConversionFileFormat,
): ConversionOption[] {
  const rasterTargets = buildRasterTargetOptions(source);
  if (rasterTargets.length > 0) {
    return rasterTargets;
  }

  return DOCUMENT_CONVERSION_MATRIX.filter((opt) => opt.source === source);
}

/** @deprecated Use DOCUMENT_CONVERSION_MATRIX or dynamic raster helpers. */
export const CONVERSION_MATRIX = [
  ...DOCUMENT_CONVERSION_MATRIX,
  ...RASTER_IMAGE_SOURCES.flatMap((entry) =>
    buildRasterTargetOptions(entry.source),
  ),
] as const;
