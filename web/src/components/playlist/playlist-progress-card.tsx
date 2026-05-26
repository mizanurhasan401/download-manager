'use client';

import { useMemo } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loading } from '@/components/shared/loading';
import { ErrorState } from '@/components/shared/error-state';
import { usePlaylistStatus } from '@/features/playlists/hooks/usePlaylistStatus';
import type { PlaylistStatusValue } from '@/types/api';

interface PlaylistProgressCardProps {
  playlistId: string;
  onDismiss?: () => void;
}

const statusVariant: Record<
  PlaylistStatusValue,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  PENDING: 'secondary',
  EXTRACTING: 'secondary',
  READY: 'secondary',
  PROCESSING: 'default',
  COMPLETED: 'success',
  PARTIALLY_COMPLETED: 'warning',
  FAILED: 'destructive',
  CANCELLED: 'destructive',
};

const statusLabel: Record<PlaylistStatusValue, string> = {
  PENDING: 'Pending',
  EXTRACTING: 'Extracting',
  READY: 'Ready',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  PARTIALLY_COMPLETED: 'Partially completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export function PlaylistProgressCard({
  playlistId,
  onDismiss,
}: PlaylistProgressCardProps) {
  const { data, isLoading, isError, refetch } = usePlaylistStatus(playlistId);

  const aggregate = useMemo(() => {
    if (!data) return null;
    const total = data.selectedItems || data.totalItems || data.items.length;
    return { total };
  }, [data]);

  if (isLoading && !data) {
    return <Loading label="Loading playlist progress..." />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Could not load playlist"
        message="The playlist status could not be retrieved."
        onRetry={() => refetch()}
      />
    );
  }

  const isTerminal =
    data.status === 'COMPLETED' ||
    data.status === 'PARTIALLY_COMPLETED' ||
    data.status === 'FAILED' ||
    data.status === 'CANCELLED';

  const total = aggregate?.total ?? data.totalItems;

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base">
            {data.title ?? 'Playlist download'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[data.status]}>
              {statusLabel[data.status]}
            </Badge>
            <span className="text-xs text-muted-foreground tabular-nums">
              {total} item{total === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        {onDismiss && isTerminal && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress
          value={
            data.status === 'COMPLETED'
              ? 100
              : data.status === 'PROCESSING'
                ? undefined
                : data.status === 'PARTIALLY_COMPLETED'
                  ? 100
                  : 0
          }
        />

        {!isTerminal && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Items are being downloaded in the background. Check the History
            page to monitor each item.
          </div>
        )}

        {data.status === 'COMPLETED' && (
          <div className="flex items-center gap-2 text-sm text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
            All {total} item{total === 1 ? '' : 's'} downloaded successfully.
          </div>
        )}

        {data.status === 'PARTIALLY_COMPLETED' && (
          <div className="text-sm text-amber-500">
            Some items completed and some failed. Open the History page to
            inspect individual jobs.
          </div>
        )}

        {data.status === 'FAILED' && (
          <div className="text-sm text-destructive">
            All items failed to download.
          </div>
        )}

        <p className="text-xs text-muted-foreground">Playlist ID: {data.id}</p>
      </CardContent>
    </Card>
  );
}
