'use client';

import { AdBase } from './ad-base';
import type { BaseAdProps } from './types';

/**
 * Horizontal responsive banner. Ideal for above-the-fold placements at the
 * top of a page or between major content blocks.
 *
 * Default reserved height (~90px) matches the typical leaderboard size — the
 * actual served ad will resize the `<ins>` once it loads.
 */
export function AdBanner(props: BaseAdProps) {
  return <AdBase {...props} format="horizontal" minHeight={90} />;
}
