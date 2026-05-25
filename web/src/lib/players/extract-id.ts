import type { PlayerKindResult } from './types';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);

const VIMEO_HOSTS = new Set([
  'vimeo.com',
  'www.vimeo.com',
  'player.vimeo.com',
]);

export function extractYouTubeId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    if (!YOUTUBE_HOSTS.has(host)) return null;

    if (host === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '').split('/')[0];
      return id || null;
    }

    const vParam = url.searchParams.get('v');
    if (vParam) return vParam;

    const segments = url.pathname.split('/').filter(Boolean);
    const shortsIndex = segments.indexOf('shorts');
    if (shortsIndex >= 0 && segments[shortsIndex + 1]) {
      return segments[shortsIndex + 1];
    }
    const liveIndex = segments.indexOf('live');
    if (liveIndex >= 0 && segments[liveIndex + 1]) {
      return segments[liveIndex + 1];
    }
    const embedIndex = segments.indexOf('embed');
    if (embedIndex >= 0 && segments[embedIndex + 1]) {
      return segments[embedIndex + 1];
    }

    return null;
  } catch {
    return null;
  }
}

export function extractVimeoId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    if (!VIMEO_HOSTS.has(host)) return null;

    const segments = url.pathname.split('/').filter(Boolean);
    for (const segment of segments) {
      if (/^\d+$/.test(segment)) return segment;
    }
    return null;
  } catch {
    return null;
  }
}

export function detectPlayerKind(rawUrl: string): PlayerKindResult | null {
  const ytId = extractYouTubeId(rawUrl);
  if (ytId) return { kind: 'youtube', externalId: ytId };

  const vimeoId = extractVimeoId(rawUrl);
  if (vimeoId) return { kind: 'vimeo', externalId: vimeoId };

  return null;
}
