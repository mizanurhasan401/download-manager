export const QUEUE_NAMES = {
  VIDEO_DOWNLOAD: 'video-download-queue',
} as const;

export const API_PREFIX = 'api/v1';

import { getAllProviderDomains } from '../providers/provider-registry';

export const ALLOWED_PROVIDERS = getAllProviderDomains();

export const STORAGE_DIRS = {
  VIDEOS: 'videos',
  AUDIO: 'audio',
  THUMBNAILS: 'thumbnails',
  TEMP: 'temp',
  MERGED: 'merged',
} as const;

export const YTDLP_TIMEOUT_MS = 300_000;
export const FFMPEG_TIMEOUT_MS = 600_000;
