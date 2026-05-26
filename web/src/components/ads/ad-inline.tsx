'use client';

import { AdBase } from './ad-base';
import type { BaseAdProps } from './types';

/**
 * Generic responsive inline ad — drops into any flow context (between cards,
 * after a workflow step). AdSense `format="auto"` lets the engine pick the
 * best creative for the available width.
 */
export function AdInline(props: BaseAdProps) {
  return <AdBase {...props} format="auto" minHeight={250} />;
}
