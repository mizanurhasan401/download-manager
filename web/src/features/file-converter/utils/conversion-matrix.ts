import type {
  ConversionFileFormat,
  CreateConversionBody,
} from '@/types/file-converter';

export type SourceCategory = 'document' | 'image';

export interface ConversionOption {
  /** Source format extension (lowercase) we can detect from the dropped file. */
  source: ConversionFileFormat;
  /** Target format string accepted by the backend DTO. */
  target: CreateConversionBody['targetFormat'];
  /** Display label shown in the format selector. */
  label: string;
  /** Whether the conversion belongs to the document or image pipeline. */
  category: SourceCategory;
  /** MIME types accepted for this source. */
  mimes: string[];
  /** Extensions accepted (lowercase, no dot). */
  extensions: string[];
}

/**
 * Whitelisted source → target pairs. Mirrors `SUPPORTED_CONVERSIONS` in the
 * backend constants — kept in sync manually so the UI can filter targets per
 * source format without an extra round-trip.
 */
export const CONVERSION_MATRIX: readonly ConversionOption[] = [
  // Documents
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
  // Images
  {
    source: 'PNG',
    target: 'JPG',
    label: 'PNG → JPG',
    category: 'image',
    mimes: ['image/png'],
    extensions: ['png'],
  },
  {
    source: 'JPG',
    target: 'PNG',
    label: 'JPG → PNG',
    category: 'image',
    mimes: ['image/jpeg'],
    extensions: ['jpg', 'jpeg'],
  },
  {
    source: 'WEBP',
    target: 'PNG',
    label: 'WebP → PNG',
    category: 'image',
    mimes: ['image/webp'],
    extensions: ['webp'],
  },
  {
    source: 'PNG',
    target: 'WEBP',
    label: 'PNG → WebP',
    category: 'image',
    mimes: ['image/png'],
    extensions: ['png'],
  },
] as const;

export const ALL_ACCEPTED_MIMES = Array.from(
  new Set(CONVERSION_MATRIX.flatMap((opt) => opt.mimes)),
).join(',');

export const ALL_ACCEPTED_EXTENSIONS = Array.from(
  new Set(CONVERSION_MATRIX.flatMap((opt) => opt.extensions)),
);

/**
 * Detect the source format of a `File` by inspecting MIME first and falling
 * back to its extension (browsers send empty MIME for `.txt` in some cases).
 */
export function detectSourceFormat(file: File): ConversionFileFormat | null {
  const byMime = CONVERSION_MATRIX.find((opt) => opt.mimes.includes(file.type));
  if (byMime) return byMime.source;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const byExt = CONVERSION_MATRIX.find((opt) => opt.extensions.includes(ext));
  return byExt?.source ?? null;
}

export function getAvailableTargets(
  source: ConversionFileFormat,
): ConversionOption[] {
  return CONVERSION_MATRIX.filter((opt) => opt.source === source);
}
