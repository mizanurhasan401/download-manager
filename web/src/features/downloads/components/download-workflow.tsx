'use client';

import { useRef, useState } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { MetadataCard } from '@/components/download/metadata-card';
import { ProgressCard } from '@/components/download/progress-card';
import { QualitySelector } from '@/components/download/quality-selector';
import { TrimSelector } from '@/components/download/trim-selector';
import { UrlInput, type UrlInputHandle } from '@/components/download/url-input';
import { ClipboardSuggestion } from '@/features/clipboard/components/clipboard-suggestion';
import { useClipboardVideoDetector } from '@/features/clipboard/hooks/useClipboardVideoDetector';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStartDownload } from '@/features/downloads/hooks/useStartDownload';
import { useFetchMetadata } from '@/features/metadata/hooks/useFetchMetadata';
import { useDownloadUiStore } from '@/store/download.store';
import type { VideoMetadata } from '@/types/api';

export function DownloadWorkflow() {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const urlInputRef = useRef<UrlInputHandle>(null);

  const activeJobId = useDownloadUiStore((s) => s.activeJobId);
  const selection = useDownloadUiStore((s) => s.selection);
  const clipRange = useDownloadUiStore((s) => s.clipRange);
  const setActiveJobId = useDownloadUiStore((s) => s.setActiveJobId);
  const clearSelection = useDownloadUiStore((s) => s.clearSelection);
  const clearClipRange = useDownloadUiStore((s) => s.clearClipRange);

  const fetchMetadata = useFetchMetadata();
  const startDownload = useStartDownload();

  const clipboard = useClipboardVideoDetector({
    enabled: !metadata && !fetchMetadata.isPending,
  });

  const handleFetch = (url: string) => {
    setMetadata(null);
    clearSelection();
    clearClipRange();
    setActiveJobId(null);

    fetchMetadata.mutate(
      { url },
      {
        onSuccess: (data) => setMetadata(data),
      },
    );
  };

  const handleClipboardAccept = (url: string) => {
    clipboard.dismiss();
    urlInputRef.current?.setUrl(url, { autoSubmit: true });
  };

  const handleStart = () => {
    if (!metadata || !selection) return;

    const useClip =
      clipRange?.enabled &&
      clipRange.endSeconds > clipRange.startSeconds &&
      !(
        clipRange.startSeconds === 0 &&
        metadata.duration !== undefined &&
        clipRange.endSeconds >= metadata.duration
      );

    startDownload.mutate({
      videoId: metadata.videoId,
      formatId: selection.formatId,
      quality: selection.quality,
      mediaType: selection.mediaType,
      audioBitrate: selection.audioBitrate,
      clipStartSeconds: useClip ? clipRange.startSeconds : undefined,
      clipEndSeconds: useClip ? clipRange.endSeconds : undefined,
    });
  };

  const handleReset = () => {
    setMetadata(null);
    clearSelection();
    clearClipRange();
    setActiveJobId(null);
    fetchMetadata.reset();
    startDownload.reset();
  };

  const showProgress = Boolean(activeJobId);
  const canStart = Boolean(metadata && selection && !startDownload.isPending);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Download videos"
        description="Paste a link from YouTube, TikTok, Instagram, Facebook, Vimeo, or X to fetch metadata and start a download."
      />

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle>Video URL</CardTitle>
          <CardDescription>
            Enter a supported video link to preview available formats.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {clipboard.detection && (
            <ClipboardSuggestion
              detection={clipboard.detection}
              onAccept={handleClipboardAccept}
              onDismiss={clipboard.dismiss}
            />
          )}
          <UrlInput
            ref={urlInputRef}
            onSubmit={handleFetch}
            isLoading={fetchMetadata.isPending}
          />
        </CardContent>
      </Card>

      {metadata && (
        <div className="space-y-6">
          <MetadataCard metadata={metadata} />
          <QualitySelector metadata={metadata} />
          <TrimSelector metadata={metadata} />

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={handleStart}
              disabled={!canStart}
            >
              <Download className="h-4 w-4" />
              {startDownload.isPending ? 'Starting...' : 'Start download'}
            </Button>
            <Button variant="outline" size="lg" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              Start over
            </Button>
          </div>
        </div>
      )}

      {showProgress && activeJobId && (
        <ProgressCard
          jobId={activeJobId}
          onDismiss={() => setActiveJobId(null)}
        />
      )}
    </div>
  );
}
