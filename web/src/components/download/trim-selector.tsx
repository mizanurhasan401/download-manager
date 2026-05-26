'use client';

import { Scissors } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn, formatDuration } from '@/lib/utils';
import { useDownloadUiStore, type ClipRange } from '@/store/download.store';
import type { VideoMetadata } from '@/types/api';

interface TrimSelectorProps {
  metadata: VideoMetadata;
}

function parseTimeString(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const num = parseFloat(trimmed);
    return Number.isFinite(num) ? num : null;
  }

  const parts = trimmed.split(':').map((part) => part.trim());
  if (parts.some((part) => part === '' || Number.isNaN(Number(part)))) {
    return null;
  }

  const nums = parts.map((part) => Number(part));
  if (nums.length === 2) {
    const [m, s] = nums;
    return m * 60 + s;
  }
  if (nums.length === 3) {
    const [h, m, s] = nums;
    return h * 3600 + m * 60 + s;
  }
  return null;
}

function clampRange(
  start: number,
  end: number,
  duration: number,
): { start: number; end: number } {
  const safeStart = Math.max(0, Math.min(start, duration - 1));
  const safeEnd = Math.max(safeStart + 1, Math.min(end, duration));
  return { start: Math.round(safeStart), end: Math.round(safeEnd) };
}

export function TrimSelector({ metadata }: TrimSelectorProps) {
  const duration = metadata.duration ?? 0;
  const clipRange = useDownloadUiStore((s) => s.clipRange);
  const setClipRange = useDownloadUiStore((s) => s.setClipRange);

  const enabled = clipRange?.enabled ?? false;

  const [startDraft, setStartDraft] = useState<string | null>(null);
  const [endDraft, setEndDraft] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const startInput =
    startDraft ?? formatDuration(clipRange?.startSeconds ?? 0);
  const endInput =
    endDraft ?? formatDuration(clipRange?.endSeconds ?? duration);

  const updateRange = useCallback(
    (next: ClipRange) => {
      setClipRange(next);
      setInputError(null);
    },
    [setClipRange],
  );

  const handleToggle = () => {
    if (duration <= 0) return;

    if (enabled) {
      setClipRange(null);
      setStartDraft(null);
      setEndDraft(null);
      setInputError(null);
      return;
    }

    const defaultEnd = Math.min(Math.max(Math.round(duration / 2), 1), duration);
    updateRange({
      enabled: true,
      startSeconds: 0,
      endSeconds: defaultEnd,
    });
  };

  const handleSliderChange = (values: number[]) => {
    if (!enabled || duration <= 0) return;
    const [s, e] = values;
    const { start, end } = clampRange(s, e, duration);
    updateRange({ enabled: true, startSeconds: start, endSeconds: end });
  };

  const commitStartInput = () => {
    if (!enabled || startDraft === null) return;
    const parsed = parseTimeString(startDraft);
    if (parsed === null) {
      setInputError('Use format like 1:30 or 90');
      return;
    }
    const currentEnd = clipRange?.endSeconds ?? duration;
    const { start, end } = clampRange(parsed, currentEnd, duration);
    setStartDraft(null);
    updateRange({ enabled: true, startSeconds: start, endSeconds: end });
  };

  const commitEndInput = () => {
    if (!enabled || endDraft === null) return;
    const parsed = parseTimeString(endDraft);
    if (parsed === null) {
      setInputError('Use format like 2:45 or 165');
      return;
    }
    const currentStart = clipRange?.startSeconds ?? 0;
    const { start, end } = clampRange(currentStart, parsed, duration);
    setEndDraft(null);
    updateRange({ enabled: true, startSeconds: start, endSeconds: end });
  };

  const sliderValue = useMemo(() => {
    if (clipRange) {
      return [clipRange.startSeconds, clipRange.endSeconds];
    }
    return [0, duration];
  }, [clipRange, duration]);

  const clipLength = clipRange
    ? clipRange.endSeconds - clipRange.startSeconds
    : duration;

  if (!duration || duration <= 0) {
    return null;
  }

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            Trim video (optional)
          </CardTitle>
          <CardDescription>
            Download only a section of the video. Leave off to download the
            full length.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant={enabled ? 'default' : 'outline'}
          size="sm"
          onClick={handleToggle}
        >
          {enabled ? 'Trim: On' : 'Trim: Off'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        <div
          className={cn(
            'space-y-3 transition-opacity',
            !enabled && 'pointer-events-none opacity-50',
          )}
        >
          <Slider
            value={sliderValue}
            min={0}
            max={duration}
            step={1}
            onValueChange={handleSliderChange}
            disabled={!enabled}
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0:00</span>
            <span>{formatDuration(duration)}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="trim-start"
                className="text-xs font-medium text-muted-foreground text-left"
              >
                Start time
              </label>
              <Input
                id="trim-start"
                value={startInput}
                onChange={(e) => setStartDraft(e.target.value)}
                onBlur={commitStartInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitStartInput();
                  }
                }}
                placeholder="0:00"
                disabled={!enabled}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="trim-end"
                className="text-xs font-medium text-muted-foreground text-left"
              >
                End time
              </label>
              <Input
                id="trim-end"
                value={endInput}
                onChange={(e) => setEndDraft(e.target.value)}
                onBlur={commitEndInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitEndInput();
                  }
                }}
                placeholder={formatDuration(duration)}
                disabled={!enabled}
                inputMode="numeric"
              />
            </div>
          </div>

          {inputError && (
            <p className="text-sm text-destructive">{inputError}</p>
          )}

          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Clip length</span>
            <span className="font-medium tabular-nums">
              {formatDuration(clipLength)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
