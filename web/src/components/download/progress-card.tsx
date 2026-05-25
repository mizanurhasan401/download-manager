'use client';

import { useMemo } from 'react';
import { Download, Gauge, Loader2, Timer, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loading } from '@/components/shared/loading';
import { ErrorState } from '@/components/shared/error-state';
import { useDownloadStatus } from '@/features/downloads/hooks/useDownloadStatus';
import { useDownloadProgressStream } from '@/features/downloads/hooks/useDownloadProgressStream';
import {
  formatBytes,
  formatBytesPerSec,
  formatEta,
  getDownloadFileUrl,
} from '@/lib/utils';
import { MediaPlayer } from '@/components/download/media-player';
import type { DownloadProgressEvent, DownloadStatus } from '@/types/api';

interface ProgressCardProps {
  jobId: string;
  onDismiss?: () => void;
}

const statusVariant: Record<
  DownloadStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  PENDING: 'secondary',
  QUEUED: 'secondary',
  PROCESSING: 'default',
  MERGING: 'warning',
  COMPLETED: 'success',
  FAILED: 'destructive',
  CANCELLED: 'destructive',
};

const statusLabel: Record<DownloadStatus, string> = {
  PENDING: 'Pending',
  QUEUED: 'Queued',
  PROCESSING: 'Processing',
  MERGING: 'Merging',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

function resolveDisplayPercent(
  liveEvent: DownloadProgressEvent | null,
  fallbackPercent: number,
  isComplete: boolean,
): number {
  if (isComplete) return 100;
  if (liveEvent?.percent !== undefined && liveEvent.percent !== null) {
    return Math.min(Math.max(liveEvent.percent, 0), 100);
  }
  return fallbackPercent;
}

export function ProgressCard({ jobId, onDismiss }: ProgressCardProps) {
  const { data, isLoading, isError, refetch } = useDownloadStatus(jobId);
  const { event: liveEvent, isConnected } = useDownloadProgressStream(jobId);

  const isComplete = data?.status === 'COMPLETED';

  const displayPercent = useMemo(
    () => resolveDisplayPercent(liveEvent, data?.progress ?? 0, isComplete),
    [liveEvent, data?.progress, isComplete],
  );

  if (isLoading && !data) {
    return <Loading label="Loading download status..." />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Could not load download"
        message="The download status could not be retrieved."
        onRetry={() => refetch()}
      />
    );
  }

  const isActive = ['PENDING', 'QUEUED', 'PROCESSING', 'MERGING'].includes(data.status);
  const isFailed = data.status === 'FAILED' || data.status === 'CANCELLED';

  const phaseLabel =
    liveEvent?.phaseLabel ?? (isActive ? 'Preparing...' : statusLabel[data.status]);

  const speed = liveEvent?.speedBytesPerSec ?? null;
  const eta = liveEvent?.etaSeconds ?? null;
  const downloaded = liveEvent?.downloadedBytes ?? null;
  const total = liveEvent?.totalBytes ?? null;

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base">
            {data.video?.title ?? data.fileName ?? 'Download in progress'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[data.status]}>{statusLabel[data.status]}</Badge>
            {isActive && (
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Live' : 'Connecting...'}
              </span>
            )}
          </div>
        </div>
        {onDismiss && !isActive && (
          <Button variant="ghost" size="icon" onClick={onDismiss} aria-label="Dismiss">
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{phaseLabel}</span>
            <span className="font-medium tabular-nums">
              {displayPercent.toFixed(1)}%
            </span>
          </div>
          <Progress value={displayPercent} />

          {isActive && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
              <span className="inline-flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5" />
                {formatBytesPerSec(speed)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" />
                ETA {formatEta(eta)}
              </span>
              {total ? (
                <span>
                  {formatBytes(downloaded ?? 0)} / {formatBytes(total)}
                </span>
              ) : null}
            </div>
          )}
        </div>

        {isActive && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {phaseLabel} — please keep this tab open.
          </div>
        )}

        {isComplete && (
          <div className="space-y-4">
            <MediaPlayer
              jobId={data.id}
              mediaType={data.mediaType}
              title={data.video?.title ?? data.fileName ?? undefined}
            />
            <Button asChild className="w-full sm:w-auto" variant="outline">
              <a href={getDownloadFileUrl(data.id)} download>
                <Download className="h-4 w-4" />
                Save to device
              </a>
            </Button>
          </div>
        )}

        {isFailed && data.errorMessage && (
          <p className="text-sm text-destructive">{data.errorMessage}</p>
        )}

        <p className="text-xs text-muted-foreground">
          Job ID: {data.id}
          <Link href="/history" className="ml-2 text-primary hover:underline">
            View history
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
