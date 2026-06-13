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

export interface YtDlpPlaylistEntry {
  id?: string;
  url?: string;
  webpage_url?: string;
  title?: string;
  duration?: number;
  thumbnail?: string;
  thumbnails?: Array<{ url: string; width?: number; height?: number }>;
  uploader?: string;
  ie_key?: string;
}

export interface YtDlpPlaylistMetadata {
  _type?: 'playlist' | 'multi_video' | string;
  id: string;
  title?: string;
  uploader?: string;
  description?: string;
  webpage_url: string;
  playlist_count?: number;
  entries?: YtDlpPlaylistEntry[];
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
