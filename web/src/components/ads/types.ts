import type { CSSProperties } from 'react';

/**
 * Layouts recognised by AdSense `<ins data-ad-format>`.
 *
 * - `auto`        — responsive, picks best size automatically (default)
 * - `fluid`       — full-width, height grows to content (used for in-article)
 * - `rectangle`   — fixed rectangle slot
 * - `horizontal`  — wide banner
 * - `vertical`    — tall sidebar
 */
export type AdFormat =
  | 'auto'
  | 'fluid'
  | 'rectangle'
  | 'horizontal'
  | 'vertical';

export type AdLayout = 'in-article' | 'in-feed';

/** Props common to every concrete ad component (`AdBanner`, `AdSidebar`, …). */
export interface BaseAdProps {
  /** Slot id from the AdSense dashboard (the long numeric string). */
  slot: string;
  /** Optional wrapper className for spacing/positioning. */
  className?: string;
  /** Custom inline styles on the wrapper. */
  style?: CSSProperties;
  /**
   * Render the ad only when the wrapper scrolls into the viewport.
   * Defaults to `true` for performance/CWV.
   */
  lazy?: boolean;
  /**
   * Accessible label for the surrounding `<aside>`. Defaults to "Advertisement".
   */
  ariaLabel?: string;
}

/**
 * Augment the global `Window` so TypeScript knows about `adsbygoogle`.
 * Each push slot accepts `{}` (auto) or specific config objects.
 */
declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}
