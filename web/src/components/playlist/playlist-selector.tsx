'use client';

import { ListChecks, Loader2, Music, User } from 'lucide-react';
import Image from 'next/image';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
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
  { value: 'BEST', label: 'Best available', description: 'Highest quality each video has' },
  { value: 'Q_2160P', label: '2160p (4K) max', description: 'Cap at 4K if available' },
  { value: 'Q_1440P', label: '1440p (2K) max', description: 'Cap at 1440p' },
  { value: 'Q_1080P', label: '1080p max', description: 'Full HD' },
  { value: 'Q_720P', label: '720p max', description: 'HD' },
  { value: 'Q_480P', label: '480p max', description: 'Smaller files' },
  { value: 'AUDIO_MP3', label: 'Audio only (MP3)', description: 'Extract audio as MP3' },
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

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{playlist.provider}</Badge>
                <Badge variant="outline">
                  {playlist.totalItems} video
                  {playlist.totalItems === 1 ? '' : 's'}
                </Badge>
              </div>
              <CardTitle className="text-lg leading-tight">
                {playlist.title ?? 'Untitled playlist'}
              </CardTitle>
              {playlist.uploader && (
                <CardDescription className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {playlist.uploader}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Quality preference
              </label>
              <Select
                value={playlistSelection?.qualityPreference ?? 'Q_1080P'}
                onValueChange={handleQualityChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUALITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col text-left">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAudio && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  MP3 bitrate
                </label>
                <Select
                  value={(playlistSelection?.audioBitrate ?? 192).toString()}
                  onValueChange={handleBitrateChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIO_BITRATE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
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
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleSelectAll}
              >
                Select all
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleSelectNone}
              >
                Select none
              </Button>
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
