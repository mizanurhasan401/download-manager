'use client';

import { useEffect, useMemo } from 'react';
import { ChevronDown, Download, Music } from 'lucide-react';
import * as SelectPrimitive from '@radix-ui/react-select';
import {
  Select,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { cn, formatBytes } from '@/lib/utils';
import { AUDIO_BITRATE_OPTIONS } from '@/constants';
import { useDownloadUiStore } from '@/store/download.store';
import type { MediaType, VideoFormat, VideoMetadata } from '@/types/api';

interface InlineDownloadActionProps {
  metadata: VideoMetadata;
  onStart: () => void;
  isStarting: boolean;
}

const DEFAULT_AUDIO_BITRATE = 192;

function filterFormats(
  formats: VideoFormat[],
  mediaType: MediaType,
): VideoFormat[] {
  if (mediaType === 'VIDEO') {
    const withAudio = formats.filter((f) => f.hasVideo && f.hasAudio);
    if (withAudio.length > 0) return withAudio;
    return formats.filter((f) => f.hasVideo);
  }
  return formats.filter((f) => f.hasAudio);
}

function shortQualityLabel(format: VideoFormat): string {
  const ext = (format.ext || 'mp4').toUpperCase();
  const q = format.quality || format.resolution || '';
  return q ? `${ext} ${q}` : ext;
}

function shortQualitySizeLabel(format: VideoFormat): string {
  const parts: string[] = [];
  if (format.quality) parts.push(format.quality);
  if (format.resolution) parts.push(format.resolution);
  if (format.fileSize) parts.push(formatBytes(format.fileSize));
  return parts.join(' · ');
}

export function InlineDownloadAction({
  metadata,
  onStart,
  isStarting,
}: InlineDownloadActionProps) {
  const selection = useDownloadUiStore((s) => s.selection);
  const setSelection = useDownloadUiStore((s) => s.setSelection);

  const videoFormats = useMemo(
    () => filterFormats(metadata.formats, 'VIDEO'),
    [metadata.formats],
  );
  const audioFormats = useMemo(
    () => filterFormats(metadata.formats, 'AUDIO'),
    [metadata.formats],
  );

  const mediaType = selection?.mediaType ?? 'VIDEO';
  const isAudio = mediaType === 'AUDIO';
  const activeFormats = isAudio ? audioFormats : videoFormats;

  useEffect(() => {
    const formats = filterFormats(metadata.formats, mediaType);
    if (formats.length === 0) return;

    const currentValid =
      selection && formats.some((f) => f.formatId === selection.formatId);
    if (!currentValid) {
      const first = formats[0];
      setSelection({
        formatId: first.formatId,
        quality: first.quality,
        mediaType,
        audioBitrate: isAudio ? DEFAULT_AUDIO_BITRATE : undefined,
      });
    }
  }, [metadata.formats, mediaType, selection, setSelection, isAudio]);

  const toggleMediaType = () => {
    const nextType: MediaType = isAudio ? 'VIDEO' : 'AUDIO';
    const formats = filterFormats(metadata.formats, nextType);
    if (formats.length === 0) return;
    const first = formats[0];
    setSelection({
      formatId: first.formatId,
      quality: first.quality,
      mediaType: nextType,
      audioBitrate: nextType === 'AUDIO' ? DEFAULT_AUDIO_BITRATE : undefined,
    });
  };

  const handleFormatChange = (formatId: string) => {
    const format = activeFormats.find((f) => f.formatId === formatId);
    if (!format) return;
    setSelection({
      formatId: format.formatId,
      quality: format.quality,
      mediaType,
      audioBitrate: isAudio
        ? (selection?.audioBitrate ?? DEFAULT_AUDIO_BITRATE)
        : undefined,
    });
  };

  const handleBitrateChange = (value: string) => {
    if (!selection) return;
    setSelection({
      ...selection,
      audioBitrate: parseInt(value, 10),
    });
  };

  const currentFormat = activeFormats.find(
    (f) => f.formatId === selection?.formatId,
  );

  const triggerLabel = isAudio
    ? `MP3 ${selection?.audioBitrate ?? DEFAULT_AUDIO_BITRATE}`
    : currentFormat
      ? shortQualityLabel(currentFormat)
      : 'MP4';

  const canDownload = Boolean(selection) && !isStarting;
  const hasAudioOption = audioFormats.length > 0;
  const hasVideoOption = videoFormats.length > 0;

  const altModeLabel = isAudio
    ? hasVideoOption
      ? 'HD / MP4'
      : 'MP4'
    : hasAudioOption
      ? 'HD / MP3'
      : 'MP3';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-stretch overflow-hidden rounded-xl shadow-sm">
        <button
          type="button"
          onClick={onStart}
          disabled={!canDownload}
          className={cn(
            'inline-flex h-11 items-center gap-2 bg-emerald-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          <Download className="h-4 w-4" />
          {isStarting ? 'Starting…' : 'Download'}
        </button>

        {isAudio ? (
          <Select
            value={(
              selection?.audioBitrate ?? DEFAULT_AUDIO_BITRATE
            ).toString()}
            onValueChange={handleBitrateChange}
          >
            <SelectPrimitive.Trigger
              className={cn(
                'inline-flex h-11 items-center gap-1.5 border-l border-emerald-700/40 bg-emerald-500/90 px-3 text-sm font-semibold text-white outline-none transition-colors hover:bg-emerald-600 focus:outline-none data-[state=open]:bg-emerald-600',
              )}
              aria-label="Select audio bitrate"
            >
              <span className="tabular-nums">{triggerLabel}</span>
              <ChevronDown className="h-4 w-4 opacity-90" />
            </SelectPrimitive.Trigger>
            <SelectContent align="end">
              {AUDIO_BITRATE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  MP3 · {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select
            value={selection?.formatId}
            onValueChange={handleFormatChange}
          >
            <SelectPrimitive.Trigger
              className={cn(
                'inline-flex h-11 items-center gap-1.5 border-l border-emerald-700/40 bg-emerald-500/90 px-3 text-sm font-semibold text-white outline-none transition-colors hover:bg-emerald-600 focus:outline-none data-[state=open]:bg-emerald-600',
              )}
              aria-label="Select video quality"
            >
              <span className="tabular-nums">{triggerLabel}</span>
              <ChevronDown className="h-4 w-4 opacity-90" />
            </SelectPrimitive.Trigger>
            <SelectContent align="end" className="min-w-56">
              {videoFormats.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No video formats available
                </div>
              ) : (
                videoFormats.map((format) => (
                  <SelectItem key={format.formatId} value={format.formatId}>
                    {shortQualitySizeLabel(format)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      <button
        type="button"
        onClick={toggleMediaType}
        disabled={isAudio ? !hasVideoOption : !hasAudioOption}
        className={cn(
          'inline-flex h-11 items-center gap-2 rounded-xl border border-border/70 bg-background/60 px-4 text-sm font-medium text-foreground/90 transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40',
        )}
        title={`Switch to ${altModeLabel}`}
      >
        <Music className="h-4 w-4 text-primary" />
        <span>{altModeLabel}</span>
      </button>
    </div>
  );
}
