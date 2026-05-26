'use client';

import { AdBase } from './ad-base';
import type { BaseAdProps } from './types';

/**
 * Tall vertical / skyscraper unit for sidebar rails.
 *
 * Reserved height is generous (600px) because sidebars commonly use medium
 * rectangle (300×600) or half-page (300×600) creatives — matching CLS budget
 * is more important here than visual minimalism.
 */
export function AdSidebar(props: BaseAdProps) {
  return (
    <AdBase
      {...props}
      format="vertical"
      minHeight={props.style?.minHeight ? undefined : 600}
      // Sidebars are usually fixed-width; turn off responsive expansion so the
      // unit does not stretch beyond the rail.
      fullWidthResponsive={false}
    />
  );
}
