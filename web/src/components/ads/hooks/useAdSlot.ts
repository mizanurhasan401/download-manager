'use client';

import { useEffect, type RefObject } from 'react';
import { adsConfig } from '@/config/ads';
import { useAdsEnabled } from './useAdsEnabled';
import { useInView } from './useInView';

interface UseAdSlotOptions {
  /**
   * Wrapper element ref. The slot only loads when this element scrolls into
   * (or near) the viewport.
   */
  insRef: RefObject<HTMLModElement | null>;
  /**
   * AdSense slot id. If missing the hook is a no-op so consumers can render
   * a placeholder during local development.
   */
  slot: string;
  /** Whether to wait for IntersectionObserver visibility (default true). */
  lazy?: boolean;
}

/**
 * Module-level guard set keyed by the actual `<ins>` DOM node.
 *
 * Tracking the node itself (rather than a per-hook boolean ref) gives us
 * three properties for free:
 *
 *  1. **StrictMode double-invoke**: the two effect runs see the same node,
 *     so the second push is skipped.
 *  2. **Route changes**: when the parent unmounts and remounts a new `<ins>`,
 *     the new node is not in the set, so the push happens exactly once for
 *     the fresh element.
 *  3. **Memory**: `WeakSet` lets the GC reclaim entries automatically when
 *     the DOM node is detached — no manual cleanup required.
 *
 * AdSense itself throws if `adsbygoogle.push({})` is called twice on an
 * `<ins>` that already has `data-adsbygoogle-status="done"`, so we also
 * defensively check that attribute before pushing.
 */
const pushedNodes = new WeakSet<HTMLModElement>();

/**
 * Wires a single `<ins class="adsbygoogle">` element into AdSense safely.
 *
 * Defer the push until the slot is visible (when `lazy` is enabled) and skip
 * everything when ads are disabled (premium user, missing env, SSR).
 */
export function useAdSlot({
  insRef,
  slot,
  lazy = true,
}: UseAdSlotOptions): void {
  const adsEnabled = useAdsEnabled();
  const inView = useInView(insRef, { disabled: !lazy });

  useEffect(() => {
    if (!adsEnabled || !slot || !inView) return;

    const node = insRef.current;
    if (!node) return;

    // Same DOM node already initialised — skip.
    if (pushedNodes.has(node)) return;
    if (node.getAttribute('data-adsbygoogle-status') === 'done') {
      pushedNodes.add(node);
      return;
    }

    pushedNodes.add(node);

    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch (error) {
      // Allow retry on transient failures.
      pushedNodes.delete(node);
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[ads] adsbygoogle.push failed', error);
      }
    }
  }, [adsEnabled, slot, inView, insRef]);
}

/** Re-exported here so consumers only import from the hooks barrel. */
export { adsConfig };
