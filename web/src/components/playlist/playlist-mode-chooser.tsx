'use client';

import { Film, ListVideo } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DownloadMode } from '@/store/download.store';

interface PlaylistModeChooserProps {
  mode: DownloadMode;
  onChange: (mode: DownloadMode) => void;
  playlistCount?: number;
  isLoading?: boolean;
}

export function PlaylistModeChooser({
  mode,
  onChange,
  playlistCount,
  isLoading,
}: PlaylistModeChooserProps) {
  const countLabel =
    typeof playlistCount === 'number' && playlistCount > 0
      ? ` (${playlistCount})`
      : '';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ListVideo className="h-4 w-4 text-primary" />
        <span className="font-medium text-foreground">Playlist detected</span>
        <span className="hidden sm:inline">·</span>
        <span className="hidden sm:inline">Download just this video or all?</span>
      </div>

      <div
        role="tablist"
        aria-label="Playlist download mode"
        className="inline-flex items-center rounded-lg bg-muted p-0.5"
      >
        <ModeButton
          active={mode === 'SINGLE'}
          onClick={() => onChange('SINGLE')}
          icon={<Film className="h-3.5 w-3.5" />}
          label="This video"
        />
        <ModeButton
          active={mode === 'PLAYLIST'}
          onClick={() => onChange('PLAYLIST')}
          icon={<ListVideo className="h-3.5 w-3.5" />}
          label={`Entire playlist${countLabel}`}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
