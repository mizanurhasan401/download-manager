export type ImageOperation = 'CONVERT' | 'RESIZE' | 'REMOVE_BACKGROUND';

export type ImageJobStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export type ResizeFit = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

export type ImageFileKind = 'ORIGINAL' | 'OUTPUT';

export interface ImageJobFile {
  id: string;
  kind: ImageFileKind;
  fileName: string;
  mimeType: string;
  sizeBytes: string;
  width: number | null;
  height: number | null;
  format: string | null;
  hasAlpha: boolean;
  createdAt: string;
}

export interface ImageJob {
  id: string;
  operation: ImageOperation;
  status: ImageJobStatus;
  progress: number;
  parameters: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  files: ImageJobFile[];
}

export interface CreateImageJobBody {
  operation: ImageOperation;
  format?: OutputFormat;
  quality?: number;
  width?: number;
  height?: number;
  fit?: ResizeFit;
}
