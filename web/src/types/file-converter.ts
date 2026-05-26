export type ConversionCategory = 'DOCUMENT' | 'IMAGE';

export type ConversionJobStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'PROCESSING'
  | 'CONVERTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type ConversionFileFormat =
  | 'PDF'
  | 'DOCX'
  | 'PPTX'
  | 'XLSX'
  | 'TXT'
  | 'PNG'
  | 'JPG'
  | 'WEBP';

export type ConversionFileKind = 'ORIGINAL' | 'OUTPUT';

export interface ConversionJobFile {
  id: string;
  kind: ConversionFileKind;
  fileName: string;
  mimeType: string;
  sizeBytes: string;
  format: ConversionFileFormat | null;
  createdAt: string;
}

export interface ConversionJob {
  id: string;
  category: ConversionCategory;
  sourceFormat: ConversionFileFormat;
  targetFormat: ConversionFileFormat;
  status: ConversionJobStatus;
  progress: number;
  parameters: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  files: ConversionJobFile[];
}

/**
 * Body of `POST /file-converter/convert` (excluding the `file` part which is
 * appended to FormData separately).
 */
export interface CreateConversionBody {
  targetFormat: 'PDF' | 'DOCX' | 'PNG' | 'JPG' | 'WEBP';
  quality?: number;
}

export type ConversionSseStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'CONVERTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface ConversionProgressEvent {
  jobId: string;
  status: ConversionSseStatus;
  progress: number;
  phase?: string;
  errorMessage?: string;
  timestamp: number;
}
