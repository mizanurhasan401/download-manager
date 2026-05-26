'use client';

import { adsConfig } from '@/config/ads';
import { usePremiumStore } from '@/store/premium.store';

/**
 * Single source of truth for "should we render ads at all?".
 *
 * Resolves to `false` when:
 *  - the AdSense client env var is missing, or
 *  - the current user has premium status, or
 *  - we are in a non-browser environment.
 *
 * Components should call this once and short-circuit before touching
 * `window.adsbygoogle`.
 */
export function useAdsEnabled(): boolean {
  const isPremium = usePremiumStore((state) => state.isPremium);
  return adsConfig.enabled && !isPremium;
}
