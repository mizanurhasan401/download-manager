'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CLIPBOARD_DETECTOR } from '@/constants';
import {
  detectProvider,
  extractFirstVideoUrl,
  type ProviderDefinition,
} from '@/lib/providers';

export type ClipboardPermissionState =
  | 'unknown'
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unsupported';

export interface ClipboardDetection {
  url: string;
  provider: ProviderDefinition;
  detectedAt: number;
}

interface ClipboardDetectorOptions {
  enabled?: boolean;
  pollIntervalMs?: number;
  onDetect?: (detection: ClipboardDetection) => void;
}

interface ClipboardDetectorState {
  detection: ClipboardDetection | null;
  permission: ClipboardPermissionState;
  isPolling: boolean;
  dismiss: () => void;
  refresh: () => Promise<void>;
}

const isClipboardSupported = (): boolean =>
  typeof navigator !== 'undefined' &&
  typeof navigator.clipboard?.readText === 'function';

async function readPermission(): Promise<ClipboardPermissionState> {
  if (typeof navigator === 'undefined') return 'unsupported';
  if (!isClipboardSupported()) return 'unsupported';

  if (typeof navigator.permissions?.query !== 'function') return 'unknown';

  try {
    const result = await navigator.permissions.query({
      name: 'clipboard-read' as PermissionName,
    });
    return result.state as ClipboardPermissionState;
  } catch {
    return 'unknown';
  }
}

export function useClipboardVideoDetector(
  options: ClipboardDetectorOptions = {},
): ClipboardDetectorState {
  const {
    enabled = true,
    pollIntervalMs = CLIPBOARD_DETECTOR.pollIntervalMs,
    onDetect,
  } = options;

  const [detection, setDetection] = useState<ClipboardDetection | null>(null);
  const [permission, setPermission] =
    useState<ClipboardPermissionState>('unknown');
  const [isPolling, setIsPolling] = useState(false);

  const lastSeenRef = useRef<string | null>(null);
  const dismissedRef = useRef<Set<string>>(new Set());
  const onDetectRef = useRef(onDetect);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  const tryRead = useCallback(async (): Promise<void> => {
    if (!isClipboardSupported() || document.visibilityState !== 'visible') {
      return;
    }

    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setPermission('denied');
      return;
    }

    const trimmed = text?.trim();
    if (!trimmed || trimmed === lastSeenRef.current) return;
    lastSeenRef.current = trimmed;

    if (dismissedRef.current.has(trimmed)) return;

    const url = extractFirstVideoUrl(trimmed) ?? trimmed;
    const provider = detectProvider(url);
    if (!provider) return;

    setDetection({
      url,
      provider,
      detectedAt: Date.now(),
    });

    onDetectRef.current?.({
      url,
      provider,
      detectedAt: Date.now(),
    });
  }, []);

  useEffect(() => {
    if (!enabled || !isClipboardSupported()) {
      setPermission(isClipboardSupported() ? 'unknown' : 'unsupported');
      return;
    }

    let cancelled = false;
    void readPermission().then((state) => {
      if (!cancelled) setPermission(state);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isClipboardSupported()) return;

    setIsPolling(true);
    void tryRead();

    const onFocus = () => void tryRead();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void tryRead();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const interval = window.setInterval(() => void tryRead(), pollIntervalMs);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      setIsPolling(false);
    };
  }, [enabled, pollIntervalMs, tryRead]);

  const dismiss = useCallback(() => {
    setDetection((current) => {
      if (current) dismissedRef.current.add(current.url);
      return null;
    });
  }, []);

  const refresh = useCallback(async () => {
    lastSeenRef.current = null;
    await tryRead();
  }, [tryRead]);

  return { detection, permission, isPolling, dismiss, refresh };
}
