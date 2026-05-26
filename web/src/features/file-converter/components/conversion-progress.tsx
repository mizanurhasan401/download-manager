'use client';

import { CheckCircle2, Download, Loader2, Wifi, WifiOff, XCircle } from 'lucide-react';
import { AdResponsive } from '@/components/ads';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { adsConfig } from '@/config/ads';
import { useConversionJob } from '@/features/file-converter/hooks/useConversionJob';
import { useConversionProgressStream } from '@/features/file-converter/hooks/useConversionProgressStream';
import { formatBytes } from '@/lib/utils';
import { fileConverterService } from '@/services/file-converter/file-converter.service';
import type {
  ConversionJobStatus,
  ConversionSseStatus,
} from '@/types/file-converter';

interface ConversionProgressProps {
  jobId: string;
  onReset?: () => void;
}

const STATUS_LABEL: Record<ConversionJobStatus, string> = {
  PENDING: 'Pending',
  QUEUED: 'Queued',
  PROCESSING: 'Processing',
  CONVERTING: 'Converting',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

const SSE_STATUS_PRIORITY: ConversionSseStatus[] = [
  'QUEUED',
  'PROCESSING',
  'CONVERTING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
];

export function ConversionProgress({ jobId, onReset }: ConversionProgressProps) {
  const { data: job, isLoading } = useConversionJob(jobId);
  const stream = useConversionProgressStream(jobId);

  if (isLoading && !job) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Starting…</span>
        </CardContent>
      </Card>
    );
  }

  if (!job) return null;

  // Prefer the SSE-reported progress (most granular). The polled job acts as
  // a fallback for clients with broken SSE proxies.
  const progress = stream.event?.progress ?? job.progress;
  const phase = stream.event?.phase;

  // Use the stronger of the two signals so a quick SSE COMPLETED is honored
  // even if the polled record hasn't caught up yet.
  const displayStatus = pickDisplayStatus(job.status, stream.event?.status);

  const isActive =
    displayStatus === 'PENDING' ||
    displayStatus === 'QUEUED' ||
    displayStatus === 'PROCESSING' ||
    displayStatus === 'CONVERTING';

  const output = job.files.find((f) => f.kind === 'OUTPUT') ?? null;
  const downloadUrl = output
    ? fileConverterService.buildFileUrl(jobId, 'output')
    : null;

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {displayStatus === 'COMPLETED' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : displayStatus === 'FAILED' ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            {STATUS_LABEL[displayStatus]} · {job.sourceFormat} → {job.targetFormat}
          </CardTitle>
          {!isActive && onReset && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              Start over
            </Button>
          )}
        </div>
        <CardDescription className="flex items-center gap-2">
          <span>Job {job.id.slice(0, 8)}…</span>
          <span className="inline-flex items-center gap-1 text-xs">
            {stream.isConnected ? (
              <Wifi className="h-3 w-3 text-emerald-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="text-muted-foreground">
              {stream.isConnected ? 'Live' : 'Polling'}
            </span>
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isActive && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
              <span>{phase ?? STATUS_LABEL[displayStatus]}</span>
              <span>{Math.round(progress)}%</span>
            </p>
          </div>
        )}

        {displayStatus === 'COMPLETED' && output && (
          <>
            <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 text-sm">
                <p className="font-medium break-all">{output.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {output.format ?? '—'} ·{' '}
                  {formatBytes(Number(output.sizeBytes))}
                </p>
              </div>
              {downloadUrl && (
                <Button asChild>
                  <a href={downloadUrl} download={output.fileName}>
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </Button>
              )}
            </div>

            <AdResponsive
              slot={adsConfig.slots.result}
              ariaLabel="Result page ad"
              className="mt-2"
            />
          </>
        )}

        {displayStatus === 'FAILED' && (
          <p className="text-sm text-destructive">
            {stream.event?.errorMessage ??
              job.errorMessage ??
              'Conversion failed.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function pickDisplayStatus(
  dbStatus: ConversionJobStatus,
  sseStatus?: ConversionSseStatus,
): ConversionJobStatus {
  if (!sseStatus) return dbStatus;
  // Cannot regress: if either source reports a terminal state, keep it.
  if (dbStatus === 'COMPLETED' || dbStatus === 'FAILED') return dbStatus;
  if (sseStatus === 'COMPLETED' || sseStatus === 'FAILED') return sseStatus;

  // Otherwise prefer whichever signal is further along.
  const sseIdx = SSE_STATUS_PRIORITY.indexOf(sseStatus);
  const dbIdx = SSE_STATUS_PRIORITY.indexOf(
    dbStatus as ConversionSseStatus,
  );
  return sseIdx > dbIdx ? sseStatus : dbStatus;
}
