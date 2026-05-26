'use client';

import { CheckCircle2, Download, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useImageJob } from '@/features/images/hooks/useImageJob';
import { imageJobsService } from '@/services/image-api/image-jobs.service';
import type { ImageJobStatus } from '@/types/image';

interface ImageJobProgressProps {
  jobId: string;
  onReset?: () => void;
}

const STATUS_LABEL: Record<ImageJobStatus, string> = {
  PENDING: 'Pending',
  QUEUED: 'Queued',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImageJobProgress({ jobId, onReset }: ImageJobProgressProps) {
  const { data: job, isLoading } = useImageJob(jobId);

  if (isLoading && !job) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Starting job…</span>
        </CardContent>
      </Card>
    );
  }

  if (!job) return null;

  const isActive =
    job.status === 'PENDING' ||
    job.status === 'QUEUED' ||
    job.status === 'PROCESSING';
  const output = job.files.find((f) => f.kind === 'OUTPUT') ?? null;
  const downloadUrl = output ? imageJobsService.buildFileUrl(jobId, 'output') : null;

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {job.status === 'COMPLETED' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : job.status === 'FAILED' ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            {STATUS_LABEL[job.status]} · {job.operation.replace('_', ' ')}
          </CardTitle>
          {!isActive && onReset && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              Start over
            </Button>
          )}
        </div>
        <CardDescription>Job {job.id.slice(0, 8)}…</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isActive && (
          <div className="space-y-2">
            <Progress value={job.progress} />
            <p className="text-xs text-muted-foreground tabular-nums">
              {Math.round(job.progress)}%
            </p>
          </div>
        )}

        {job.status === 'COMPLETED' && output && (
          <div className="space-y-4">
            {downloadUrl && (
              <div
                className="flex items-center justify-center overflow-hidden rounded-xl border border-border/60"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  backgroundColor: '#1a1a1a',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={downloadUrl}
                  alt={output.fileName}
                  className="max-h-80 max-w-full object-contain"
                />
              </div>
            )}

            <div
              className={cn(
                'flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between',
              )}
            >
              <div className="space-y-1 text-sm">
                <p className="font-medium break-all">{output.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {output.width ?? '?'}×{output.height ?? '?'} ·{' '}
                  {output.format ?? '—'} · {formatBytes(Number(output.sizeBytes))}
                  {output.hasAlpha && ' · transparent'}
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
          </div>
        )}

        {job.status === 'FAILED' && (
          <p className="text-sm text-destructive">
            {job.errorMessage ?? 'Processing failed.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
