'use client';

import { Download, Play, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { MediaPlayer } from '@/components/download/media-player';
import { Progress } from '@/components/ui/progress';
import { getDownloadFileUrl } from '@/lib/utils';
import { useDownloadHistoryStore } from '@/store/download.store';
import type { DownloadStatus } from '@/types/api';

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

export function DownloadHistory() {
  const items = useDownloadHistoryStore((s) => s.items);
  const removeItem = useDownloadHistoryStore((s) => s.removeItem);
  const clearHistory = useDownloadHistoryStore((s) => s.clearHistory);
  const [playingId, setPlayingId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <EmptyState
        title="No downloads yet"
        description="Your download history will appear here after you start a download."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={clearHistory}>
          <Trash2 className="h-4 w-4" />
          Clear history
        </Button>
      </div>

      <div className="grid gap-3">
        {items.map((item) => {
          const isActive = ['PENDING', 'QUEUED', 'PROCESSING', 'MERGING'].includes(
            item.status,
          );
          const isComplete = item.status === 'COMPLETED';

          return (
            <Card key={item.id} className="border-border/60 bg-card/80">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                {item.thumbnailUrl ? (
                  <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                    No preview
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{item.title}</p>
                    <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
                    {item.quality && (
                      <Badge variant="outline">{item.quality}</Badge>
                    )}
                  </div>
                  {isActive && <Progress value={item.progress} />}
                  {item.errorMessage && (
                    <p className="text-sm text-destructive">{item.errorMessage}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  {isComplete && (
                    <>
                      <Button
                        size="sm"
                        variant={playingId === item.id ? 'secondary' : 'default'}
                        onClick={() =>
                          setPlayingId(playingId === item.id ? null : item.id)
                        }
                      >
                        <Play className="h-4 w-4" />
                        {playingId === item.id ? 'Hide' : 'Play'}
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <a href={getDownloadFileUrl(item.id)} download>
                          <Download className="h-4 w-4" />
                          Save
                        </a>
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    aria-label="Remove from history"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {isComplete && playingId === item.id && (
                  <MediaPlayer
                    jobId={item.id}
                    mediaType={item.mediaType}
                    title={item.title}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
