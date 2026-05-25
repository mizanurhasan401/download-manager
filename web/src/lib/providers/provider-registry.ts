import type { VideoProvider } from '@/types/api';

export interface ProviderDefinition {
  id: VideoProvider;
  label: string;
  brandColor: string;
  iconKey: 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'vimeo' | 'twitter' | 'other';
  domains: readonly string[];
  pathPatterns?: readonly RegExp[];
  supportsEmbed: boolean;
  supportsPlaylist: boolean;
  supportsClipping: boolean;
  audioPreferred: boolean;
}

export const PROVIDER_REGISTRY: readonly ProviderDefinition[] = [
  {
    id: 'YOUTUBE',
    label: 'YouTube',
    brandColor: '#FF0000',
    iconKey: 'youtube',
    domains: ['youtube.com', 'youtu.be', 'm.youtube.com', 'music.youtube.com'],
    pathPatterns: [/\/watch\?v=/, /\/shorts\//, /\/playlist\?list=/, /\/live\//],
    supportsEmbed: true,
    supportsPlaylist: true,
    supportsClipping: true,
    audioPreferred: false,
  },
  {
    id: 'FACEBOOK',
    label: 'Facebook',
    brandColor: '#1877F2',
    iconKey: 'facebook',
    domains: ['facebook.com', 'fb.watch', 'm.facebook.com', 'web.facebook.com'],
    pathPatterns: [/\/watch\//, /\/videos\//, /\/reel\//, /\/share\/r\//, /\/share\/v\//],
    supportsEmbed: false,
    supportsPlaylist: false,
    supportsClipping: true,
    audioPreferred: false,
  },
  {
    id: 'INSTAGRAM',
    label: 'Instagram',
    brandColor: '#E4405F',
    iconKey: 'instagram',
    domains: ['instagram.com'],
    pathPatterns: [/\/reel\//, /\/p\//, /\/tv\//, /\/stories\//],
    supportsEmbed: false,
    supportsPlaylist: false,
    supportsClipping: true,
    audioPreferred: false,
  },
  {
    id: 'TIKTOK',
    label: 'TikTok',
    brandColor: '#000000',
    iconKey: 'tiktok',
    domains: ['tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'],
    pathPatterns: [/\/video\//, /\/@/],
    supportsEmbed: false,
    supportsPlaylist: false,
    supportsClipping: true,
    audioPreferred: false,
  },
  {
    id: 'VIMEO',
    label: 'Vimeo',
    brandColor: '#1AB7EA',
    iconKey: 'vimeo',
    domains: ['vimeo.com', 'player.vimeo.com'],
    supportsEmbed: true,
    supportsPlaylist: true,
    supportsClipping: true,
    audioPreferred: false,
  },
  {
    id: 'OTHER',
    label: 'Twitter / X',
    brandColor: '#1DA1F2',
    iconKey: 'twitter',
    domains: ['twitter.com', 'x.com', 'mobile.twitter.com'],
    pathPatterns: [/\/status\//, /\/i\/status\//],
    supportsEmbed: false,
    supportsPlaylist: false,
    supportsClipping: true,
    audioPreferred: false,
  },
] as const;

const HOSTNAME_INDEX: Map<string, ProviderDefinition> = (() => {
  const map = new Map<string, ProviderDefinition>();
  for (const provider of PROVIDER_REGISTRY) {
    for (const domain of provider.domains) {
      map.set(domain, provider);
    }
  }
  return map;
})();

export function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./i, '').toLowerCase();
}

export function detectProvider(rawUrl: string): ProviderDefinition | null {
  let hostname: string;
  try {
    hostname = normalizeHostname(new URL(rawUrl).hostname);
  } catch {
    return null;
  }

  const direct = HOSTNAME_INDEX.get(hostname);
  if (direct) return direct;

  for (const [domain, provider] of HOSTNAME_INDEX.entries()) {
    if (hostname.endsWith(`.${domain}`)) {
      return provider;
    }
  }

  return null;
}

export function isSupportedUrl(rawUrl: string): boolean {
  return detectProvider(rawUrl) !== null;
}

export function extractFirstVideoUrl(text: string): string | null {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  if (!match) return null;
  return isSupportedUrl(match[0]) ? match[0] : null;
}

export function getProviderById(id: VideoProvider): ProviderDefinition | undefined {
  return PROVIDER_REGISTRY.find((provider) => provider.id === id);
}
