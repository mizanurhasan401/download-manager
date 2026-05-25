import { PROVIDER_REGISTRY } from '@/lib/providers';

export const ALLOWED_PROVIDERS = PROVIDER_REGISTRY.map((provider) => ({
  id: provider.iconKey,
  label: provider.label,
  pattern: new RegExp(
    provider.domains.map((domain) => domain.replace(/\./g, '\\.')).join('|'),
    'i',
  ),
}));

export const DOWNLOAD_POLL_INTERVAL_MS = 5000;

export const QUERY_STALE_TIME = {
  metadata: 5 * 60 * 1000,
  health: 30 * 1000,
} as const;

export const APP_NAME = 'VidGrab';

export const CLIPBOARD_DETECTOR = {
  pollIntervalMs: 1500,
  maxAgeMs: 60_000,
} as const;

export const AUDIO_BITRATE_OPTIONS = [
  { value: '128', label: '128 kbps · standard', description: 'Smaller file size' },
  { value: '192', label: '192 kbps · default', description: 'Balanced quality' },
  { value: '256', label: '256 kbps · high', description: 'Better quality' },
  { value: '320', label: '320 kbps · best', description: 'Maximum MP3 quality' },
] as const;

export type AudioBitrate = (typeof AUDIO_BITRATE_OPTIONS)[number]['value'];
