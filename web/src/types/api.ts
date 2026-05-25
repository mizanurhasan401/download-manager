export type DownloadStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'PROCESSING'
  | 'MERGING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type MediaType = 'VIDEO' | 'AUDIO';

export type VideoProvider =
  | 'YOUTUBE'
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'TIKTOK'
  | 'VIMEO'
  | 'OTHER';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: unknown;
}

export interface VideoFormat {
  formatId: string;
  ext: string;
  quality: string;
  resolution?: string;
  fileSize?: number;
  hasVideo: boolean;
  hasAudio: boolean;
  fps?: number;
  vcodec?: string;
  acodec?: string;
}

export interface VideoMetadata {
  videoId: string;
  url: string;
  provider: VideoProvider;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: number;
  uploader?: string;
  formats: VideoFormat[];
}

export interface StartDownloadPayload {
  videoId: string;
  formatId: string;
  quality?: string;
  mediaType?: MediaType;
}

export interface StartDownloadResult {
  downloadJobId: string;
  status: DownloadStatus;
  message: string;
}

export interface DownloadJobStatus {
  id: string;
  status: DownloadStatus;
  progress: number;
  downloadUrl: string | null;
  formatId: string;
  quality?: string | null;
  mediaType: MediaType;
  fileName?: string | null;
  fileSize?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  video?: {
    title?: string | null;
    thumbnailUrl?: string | null;
    url: string;
    provider: VideoProvider;
  };
}

export interface HealthCheckResult {
  status: string;
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string; message?: string }>;
  details?: Record<string, { status: string; message?: string }>;
}

export interface DownloadHistoryItem {
  id: string;
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  url: string;
  quality?: string;
  mediaType: MediaType;
  status: DownloadStatus;
  progress: number;
  createdAt: string;
  errorMessage?: string;
}

export interface ApiError {
  message: string;
  status?: number;
}

export type DownloadPhase =
  | 'PREPARING'
  | 'DOWNLOADING_VIDEO'
  | 'DOWNLOADING_AUDIO'
  | 'DOWNLOADING'
  | 'MERGING'
  | 'POSTPROCESSING'
  | 'FINISHED';

export interface DownloadProgressEvent {
  jobId: string;
  status?: 'progress' | 'completed' | 'failed';
  percent?: number;
  phase?: DownloadPhase;
  phaseLabel?: string;
  phaseIndex?: number;
  totalPhases?: number;
  speedBytesPerSec?: number | null;
  etaSeconds?: number | null;
  downloadedBytes?: number | null;
  totalBytes?: number | null;
  errorMessage?: string;
  timestamp: number;
}
