'use client';

import { AdBase } from './ad-base';
import type { BaseAdProps } from './types';

/**
 * In-article fluid ad — designed to live between paragraphs in long-form
 * content. AdSense uses `format="fluid"` + `layout="in-article"` to render
 * native-feeling units that adapt to the surrounding typography.
 */
export function AdInArticle(props: BaseAdProps) {
  return (
    <AdBase
      {...props}
      format="fluid"
      layout="in-article"
      minHeight={200}
    />
  );
}
