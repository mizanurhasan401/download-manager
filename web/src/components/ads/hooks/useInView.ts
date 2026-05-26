'use client';

import { useEffect, useState, type RefObject } from 'react';

interface UseInViewOptions {
  /** Distance from the viewport (px) at which the element is considered visible. */
  rootMargin?: string;
  /** Disable observation entirely; the hook will return `true` immediately. */
  disabled?: boolean;
  /** Once visible, stop observing (default `true`). */
  once?: boolean;
}

/**
 * Lightweight IntersectionObserver hook used by ad components to defer the
 * `adsbygoogle.push({})` call until the slot is near the viewport. Reduces
 * unused network requests and improves LCP/CLS scores on pages with many
 * below-the-fold ad units.
 *
 * When `disabled` flips to `true` after mount we use the React-recommended
 * "adjust state during render" pattern (instead of a synchronous setState
 * inside useEffect) to immediately mark the slot as in-view without an extra
 * render cycle.
 */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  { rootMargin = '200px', disabled = false, once = true }: UseInViewOptions = {},
): boolean {
  const [inView, setInView] = useState(disabled);
  const [prevDisabled, setPrevDisabled] = useState(disabled);

  if (disabled !== prevDisabled) {
    setPrevDisabled(disabled);
    if (disabled) setInView(true);
  }

  useEffect(() => {
    if (disabled) return; // already true via the render-time adjustment above

    const node = ref.current;
    // IntersectionObserver is supported on every evergreen browser; on the
    // exceedingly rare unsupported runtime the ad simply never loads, which
    // is acceptable for a tracking/UX optimisation.
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin, disabled, once]);

  return inView;
}
