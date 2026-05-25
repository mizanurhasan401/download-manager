'use client';

import { ClipboardCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ClipboardDetection } from '@/features/clipboard/hooks/useClipboardVideoDetector';

interface ClipboardSuggestionProps {
  detection: ClipboardDetection;
  onAccept: (url: string) => void;
  onDismiss: () => void;
  className?: string;
}

export function ClipboardSuggestion({
  detection,
  onAccept,
  onDismiss,
  className,
}: ClipboardSuggestionProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm',
        className,
      )}
    >
      <ClipboardCheck className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-medium text-foreground">
          {detection.provider.label} link detected in clipboard
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {detection.url}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={() => onAccept(detection.url)}
        >
          Use this link
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDismiss}
          aria-label="Dismiss clipboard suggestion"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
