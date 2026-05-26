'use client';

import { AdBase } from './ad-base';
import type { BaseAdProps } from './types';

/**
 * Fully responsive auto-sizing ad — same engine as AdInline but with a smaller
 * default reserved height for sections where ads should feel lightweight.
 * Use this when you want a unit that flexes with its container at every
 * breakpoint without dictating any minimum aspect ratio.
 */
export function AdResponsive(props: BaseAdProps) {
  return <AdBase {...props} format="auto" minHeight={120} />;
}
