export const QUEUE_NAMES = {
  VIDEO_DOWNLOAD: 'video-download-queue',
} as const;

export const API_PREFIX = 'api/v1';

export const ALLOWED_PROVIDERS = [
  'youtube.com',
  'youtu.be',
  'm.youtube.com',
  'www.youtube.com',
  'facebook.com',
  'www.facebook.com',
  'fb.watch',
  'instagram.com',
  'www.instagram.com',
  'tiktok.com',
  'www.tiktok.com',
  'vm.tiktok.com',
  'vimeo.com',
  'www.vimeo.com',
  'player.vimeo.com',
] as const;

export const STORAGE_DIRS = {
  VIDEOS: 'videos',
  AUDIO: 'audio',
  THUMBNAILS: 'thumbnails',
  TEMP: 'temp',
  MERGED: 'merged',
} as const;

export const YTDLP_TIMEOUT_MS = 300_000;
export const FFMPEG_TIMEOUT_MS = 600_000;
