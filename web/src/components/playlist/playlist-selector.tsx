'use client';

import { ListChecks, Loader2, Music } from 'lucide-react';
import Image from 'next/image';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AUDIO_BITRATE_OPTIONS } from '@/constants';
import { cn, formatDuration } from '@/lib/utils';
import { useDownloadUiStore } from '@/store/download.store';
import type {
  PlaylistMetadata,
  PlaylistQualityPreference,
} from '@/types/api';

interface PlaylistSelectorProps {
  playlist: PlaylistMetadata;
  isStartPending?: boolean;
  onStart: () => void;
}

interface QualityOption {
  value: PlaylistQualityPreference;
  label: string;
  description: string;
}

const QUALITY_OPTIONS: QualityOption[] = [
  { value: 'BEST', label: 'Best available', description: 'Highest quality' },
  { value: 'Q_2160P', label: '2160p (4K) max', description: '4K if available' },
  { value: 'Q_1440P', label: '1440p (2K) max', description: '1440p' },
  { value: 'Q_1080P', label: '1080p max', description: 'Full HD' },
  { value: 'Q_720P', label: '720p max', description: 'HD' },
  { value: 'Q_480P', label: '480p max', description: 'Smaller' },
  { value: 'AUDIO_MP3', label: 'Audio only (MP3)', description: 'Extract audio' },
];

export function PlaylistSelector({
  playlist,
  isStartPending,
  onStart,
}: PlaylistSelectorProps) {
  const playlistSelection = useDownloadUiStore((s) => s.playlistSelection);
  const setPlaylistSelection = useDownloadUiStore(
    (s) => s.setPlaylistSelection,
  );
  const patchPlaylistSelection = useDownloadUiStore(
    (s) => s.patchPlaylistSelection,
  );

  useEffect(() => {
    if (
      !playlistSelection ||
      playlistSelection.playlistId !== playlist.id
    ) {
      setPlaylistSelection({
        playlistId: playlist.id,
        selectedItemIds: playlist.items.map((item) => item.id),
        qualityPreference: 'Q_1080P',
        audioBitrate: 192,
      });
    }
  }, [playlist.id, playlist.items, playlistSelection, setPlaylistSelection]);

  const selectedIds = playlistSelection?.selectedItemIds ?? [];
  const selectedSet = new Set(selectedIds);
  const isAudio = playlistSelection?.qualityPreference === 'AUDIO_MP3';

  const toggleItem = (itemId: string) => {
    if (!playlistSelection) return;
    const next = selectedSet.has(itemId)
      ? selectedIds.filter((id) => id !== itemId)
      : [...selectedIds, itemId];
    patchPlaylistSelection({ selectedItemIds: next });
  };

  const handleSelectAll = () => {
    patchPlaylistSelection({
      selectedItemIds: playlist.items.map((item) => item.id),
    });
  };

  const handleSelectNone = () => {
    patchPlaylistSelection({ selectedItemIds: [] });
  };

  const handleQualityChange = (value: string) => {
    patchPlaylistSelection({
      qualityPreference: value as PlaylistQualityPreference,
    });
  };

  const handleBitrateChange = (value: string) => {
    patchPlaylistSelection({ audioBitrate: parseInt(value, 10) });
  };

  const totalDurationSec = playlist.items
    .filter((item) => selectedSet.has(item.id))
    .reduce((acc, item) => acc + (item.duration ?? 0), 0);

  const canStart =
    !isStartPending &&
    Boolean(playlistSelection) &&
    selectedIds.length > 0;

  const allSelected = selectedIds.length === playlist.totalItems;

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/80">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold leading-tight sm:text-lg min-w-0 truncate">
              {playlist.title ?? 'Untitled playlist'}
            </h3>

            <div className="flex items-center gap-1 sm:shrink-0">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={handleSelectAll}
                disabled={allSelected}
              >
                Select all
              </Button>
              <span className="text-muted-foreground/40">|</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={handleSelectNone}
                disabled={selectedIds.length === 0}
              >
                Select none
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium tabular-nums">
                {selectedIds.length}
              </span>
              <span className="text-muted-foreground">
                of {playlist.totalItems} selected
              </span>
              {totalDurationSec > 0 && (
                <span className="text-xs text-muted-foreground">
                  · ~{formatDuration(totalDurationSec)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <Select
                value={playlistSelection?.qualityPreference ?? 'Q_1080P'}
                onValueChange={handleQualityChange}
              >
                <SelectTrigger className="h-9 w-auto min-w-36 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {QUALITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center text-left space-x-2">
                        <span>{option.label}</span>
                        <span className=" text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isAudio && (
                <Select
                  value={(playlistSelection?.audioBitrate ?? 192).toString()}
                  onValueChange={handleBitrateChange}
                >
                  <SelectTrigger className="h-9 w-auto min-w-28 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {AUDIO_BITRATE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Playlist items</CardTitle>
          <CardDescription>
            Pick which videos to download. The chosen quality applies to each.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="divide-y divide-border/50">
            {playlist.items.map((item) => {
              const isSelected = selectedSet.has(item.id);
              return (
                <li
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 py-3 transition-colors',
                  )}
                >
                  <input
                    id={`pl-item-${item.id}`}
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleItem(item.id)}
                    className="mt-1 h-4 w-4 cursor-pointer accent-primary"
                    aria-label={`Toggle ${item.title ?? 'item'}`}
                  />
                  <label
                    htmlFor={`pl-item-${item.id}`}
                    className="flex flex-1 cursor-pointer items-center gap-3"
                  >
                    {item.thumbnailUrl ? (
                      <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                        <Image
                          src={item.thumbnailUrl}
                          alt={item.title ?? `Item ${item.position}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Music className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">
                        <span className="mr-1 text-muted-foreground tabular-nums">
                          {item.position}.
                        </span>
                        {item.title ?? 'Untitled'}
                      </p>
                      {item.duration && (
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {formatDuration(item.duration)}
                        </p>
                      )}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button size="lg" onClick={onStart} disabled={!canStart}>
          {isStartPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Queuing...
            </>
          ) : (
            <>
              <ListChecks className="h-4 w-4" />
              Download {selectedIds.length} item
              {selectedIds.length === 1 ? '' : 's'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
