export const ALLOWED_PROVIDERS = [
  { id: 'youtube', label: 'YouTube', pattern: /youtube\.com|youtu\.be/i },
  { id: 'facebook', label: 'Facebook', pattern: /facebook\.com|fb\.watch/i },
  { id: 'instagram', label: 'Instagram', pattern: /instagram\.com/i },
  { id: 'tiktok', label: 'TikTok', pattern: /tiktok\.com/i },
  { id: 'vimeo', label: 'Vimeo', pattern: /vimeo\.com/i },
] as const;

export const DOWNLOAD_POLL_INTERVAL_MS = 5000;

export const QUERY_STALE_TIME = {
  metadata: 5 * 60 * 1000,
  health: 30 * 1000,
} as const;

export const APP_NAME = 'VidGrab';
