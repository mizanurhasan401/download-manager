'use client';

import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdPlaceholderProps {
  className?: string;
  /** Optional reason shown in dev only (e.g. "Slot not configured"). */
  reason?: string;
  /** Minimum height in pixels — must match the slot to prevent CLS. */
  minHeight?: number;
  label?: string;
}

/**
 * Inert visual placeholder used by ad components when:
 *  - ads are disabled (premium user, missing env), or
 *  - the slot id is not yet configured, or
 *  - the page is server-rendered (initial paint before hydration).
 *
 * Renders the same min-height the real ad will claim, so swapping placeholder
 * → ad does not cause layout shift (CLS).
 *
 * In production it renders neutral whitespace so users never see "Ad" labels
 * on missing slots; in dev it shows a faint diagnostic box.
 */
export function AdPlaceholder({
  className,
  reason,
  minHeight = 90,
  label = 'Advertisement',
}: AdPlaceholderProps) {
  const isDev = process.env.NODE_ENV !== 'production';

  if (!isDev) {
    return (
      <div
        aria-hidden
        className={cn('w-full', className)}
        style={{ minHeight }}
      />
    );
  }

  return (
    <div
      role="presentation"
      aria-label={label}
      style={{ minHeight }}
      className={cn(
        'flex w-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 text-xs text-muted-foreground',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <ImageOff className="h-3.5 w-3.5" />
        <span>{label}{reason ? ` · ${reason}` : ''}</span>
      </div>
    </div>
  );
}
