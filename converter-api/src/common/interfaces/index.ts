import type {
  ConversionCategory,
  ConversionFileFormat,
} from '@prisma/client';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: unknown;
}

/**
 * Payload passed from the controller/service through the BullMQ queue
 * to the worker processor.
 */
export interface FileConversionJobPayload {
  jobId: string;
  category: ConversionCategory;
  sourceFormat: ConversionFileFormat;
  targetFormat: ConversionFileFormat;
  originalFilePath: string;
  originalFileName: string;
  parameters: Record<string, unknown>;
}

export interface StoredFileInfo {
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface ConvertedFileInfo {
  outputPath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  format: ConversionFileFormat;
}
