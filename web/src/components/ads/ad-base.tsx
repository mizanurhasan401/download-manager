'use client';

import { useRef, type CSSProperties } from 'react';
import { adsConfig } from '@/config/ads';
import { cn } from '@/lib/utils';
import { AdPlaceholder } from './ad-placeholder';
import { useAdSlot } from './hooks/useAdSlot';
import { useAdsEnabled } from './hooks/useAdsEnabled';
import type { AdFormat, AdLayout, BaseAdProps } from './types';

interface AdBaseProps extends BaseAdProps {
  /** AdSense `data-ad-format` (auto / fluid / horizontal / vertical / rectangle). */
  format: AdFormat;
  /** AdSense `data-ad-layout` (in-article / in-feed) — used by fluid ads. */
  layout?: AdLayout;
  /** AdSense `data-ad-layout-key` — required for some in-feed layouts. */
  layoutKey?: string;
  /**
   * Force `data-full-width-responsive`. AdSense documentation recommends
   * `true` for responsive horizontal banners.
   */
  fullWidthResponsive?: boolean;
  /**
   * Min-height reserved for the slot so the page never jumps when the ad
   * resolves. Must roughly match the expected ad height for the slot.
   */
  minHeight?: number;
  /** Inline `<ins>` style overrides (rare — prefer `format` driven sizing). */
  insStyle?: CSSProperties;
}

/**
 * The single piece of code that mounts an `<ins class="adsbygoogle">` element.
 *
 * Every other ad component (`AdBanner`, `AdSidebar`, `AdInline`, …) is a
 * thin preset that calls this base with a fixed `format` + `layout`.
 *
 * Rendering rules:
 *  1. If ads are disabled (no env, premium) → render nothing.
 *  2. If the slot id is empty → render a `<AdPlaceholder>` of matching height.
 *  3. Otherwise render the `<ins>` and let `useAdSlot` handle the push lifecycle.
 */
export function AdBase({
  slot,
  format,
  layout,
  layoutKey,
  fullWidthResponsive = true,
  className,
  style,
  insStyle,
  minHeight = 90,
  lazy = true,
  ariaLabel = 'Advertisement',
}: AdBaseProps) {
  const adsEnabled = useAdsEnabled();
  const insRef = useRef<HTMLModElement | null>(null);

  // Hooks must always run in the same order; useAdSlot internally bails out
  // when ads are disabled / slot is missing.
  useAdSlot({ insRef, slot, lazy });

  if (!adsEnabled) return null;

  if (!slot) {
    return (
      <AdPlaceholder
        className={className}
        minHeight={minHeight}
        reason="Slot not configured"
        label={ariaLabel}
      />
    );
  }

  return (
    <aside
      aria-label={ariaLabel}
      className={cn('w-full overflow-hidden', className)}
      style={style}
    >
      <ins
        ref={insRef}
        className="adsbygoogle block"
        style={{
          display: 'block',
          minHeight,
          width: '100%',
          textAlign: 'center',
          ...insStyle,
        }}
        data-ad-client={adsConfig.client}
        data-ad-slot={slot}
        data-ad-format={format}
        {...(layout ? { 'data-ad-layout': layout } : {})}
        {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
        data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
      />
    </aside>
  );
}
