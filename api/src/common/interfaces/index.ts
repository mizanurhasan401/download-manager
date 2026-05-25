export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: unknown;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface YtDlpFormat {
  format_id: string;
  ext: string;
  resolution?: string;
  format_note?: string;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  acodec?: string;
  fps?: number;
  tbr?: number;
  height?: number;
  width?: number;
  vbr?: number;
  abr?: number;
}

export interface YtDlpMetadata {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  webpage_url: string;
  extractor?: string;
  formats?: YtDlpFormat[];
}

export interface DownloadJobPayload {
  downloadJobId: string;
  videoUrl: string;
  formatId: string;
  mediaType: string;
  title?: string;
  audioBitrate?: number;
  clipStartSeconds?: number;
  clipEndSeconds?: number;
}

export interface StorageFileInfo {
  path: string;
  fileName: string;
  size: number;
  mimeType: string;
}

export interface ProcessExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
