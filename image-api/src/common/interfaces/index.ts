export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: unknown;
}

export interface ImageJobPayload {
  jobId: string;
  operation: 'CONVERT' | 'RESIZE' | 'REMOVE_BACKGROUND';
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

export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  hasAlpha: boolean;
  size: number;
}
