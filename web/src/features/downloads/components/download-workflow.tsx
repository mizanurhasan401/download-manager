'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { MetadataCard } from '@/components/download/metadata-card';
import { ProgressCard } from '@/components/download/progress-card';
import { QualitySelector } from '@/components/download/quality-selector';
import { TrimSelector } from '@/components/download/trim-selector';
import { UrlInput, type UrlInputHandle } from '@/components/download/url-input';
import { PlaylistModeChooser } from '@/components/playlist/playlist-mode-chooser';
import { PlaylistProgressCard } from '@/components/playlist/playlist-progress-card';
import { PlaylistSelector } from '@/components/playlist/playlist-selector';
import { ClipboardSuggestion } from '@/features/clipboard/components/clipboard-suggestion';
import { useClipboardVideoDetector } from '@/features/clipboard/hooks/useClipboardVideoDetector';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useStartDownload } from '@/features/downloads/hooks/useStartDownload';
import { useFetchMetadata } from '@/features/metadata/hooks/useFetchMetadata';
import { useFetchPlaylistMetadata } from '@/features/playlists/hooks/useFetchPlaylistMetadata';
import { useStartPlaylistDownload } from '@/features/playlists/hooks/useStartPlaylistDownload';
import { hasPlaylistContext } from '@/lib/providers';
import { useDownloadUiStore } from '@/store/download.store';
import type { PlaylistMetadata, VideoMetadata } from '@/types/api';

export function DownloadWorkflow() {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [playlistMetadata, setPlaylistMetadata] =
    useState<PlaylistMetadata | null>(null);
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(null);
  const urlInputRef = useRef<UrlInputHandle>(null);

  const activeJobId = useDownloadUiStore((s) => s.activeJobId);
  const activePlaylistId = useDownloadUiStore((s) => s.activePlaylistId);
  const mode = useDownloadUiStore((s) => s.mode);
  const selection = useDownloadUiStore((s) => s.selection);
  const clipRange = useDownloadUiStore((s) => s.clipRange);
  const playlistSelection = useDownloadUiStore((s) => s.playlistSelection);
  const setActiveJobId = useDownloadUiStore((s) => s.setActiveJobId);
  const setActivePlaylistId = useDownloadUiStore(
    (s) => s.setActivePlaylistId,
  );
  const setMode = useDownloadUiStore((s) => s.setMode);
  const clearSelection = useDownloadUiStore((s) => s.clearSelection);
  const clearClipRange = useDownloadUiStore((s) => s.clearClipRange);
  const clearPlaylistSelection = useDownloadUiStore(
    (s) => s.clearPlaylistSelection,
  );

  const fetchMetadata = useFetchMetadata();
  const fetchPlaylistMetadata = useFetchPlaylistMetadata();
  const startDownload = useStartDownload();
  const startPlaylistDownload = useStartPlaylistDownload();

  const clipboard = useClipboardVideoDetector({
    enabled: !metadata && !fetchMetadata.isPending,
  });

  const playlistDetected = useMemo(
    () => Boolean(submittedUrl && hasPlaylistContext(submittedUrl)),
    [submittedUrl],
  );

  useEffect(() => {
    if (
      mode === 'PLAYLIST' &&
      playlistDetected &&
      submittedUrl &&
      !playlistMetadata &&
      !fetchPlaylistMetadata.isPending
    ) {
      fetchPlaylistMetadata.mutate(
        { url: submittedUrl },
        {
          onSuccess: (data) => setPlaylistMetadata(data),
        },
      );
    }
  }, [
    mode,
    playlistDetected,
    submittedUrl,
    playlistMetadata,
    fetchPlaylistMetadata,
  ]);

  const handleFetch = (url: string) => {
    setMetadata(null);
    setPlaylistMetadata(null);
    setSubmittedUrl(url);
    clearSelection();
    clearClipRange();
    clearPlaylistSelection();
    setActiveJobId(null);
    setActivePlaylistId(null);
    setMode('SINGLE');
    fetchPlaylistMetadata.reset();

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

  const handleStartPlaylist = () => {
    if (!playlistMetadata || !playlistSelection) return;
    if (playlistSelection.selectedItemIds.length === 0) return;

    startPlaylistDownload.mutate(
      {
        playlistId: playlistMetadata.id,
        itemIds: playlistSelection.selectedItemIds,
        qualityPreference: playlistSelection.qualityPreference,
        audioBitrate:
          playlistSelection.qualityPreference === 'AUDIO_MP3'
            ? playlistSelection.audioBitrate
            : undefined,
      },
      {
        onSuccess: (data) => {
          setActivePlaylistId(data.playlistId);
        },
      },
    );
  };

  const handleReset = () => {
    setMetadata(null);
    setPlaylistMetadata(null);
    setSubmittedUrl(null);
    clearSelection();
    clearClipRange();
    clearPlaylistSelection();
    setActiveJobId(null);
    setActivePlaylistId(null);
    setMode('SINGLE');
    fetchMetadata.reset();
    fetchPlaylistMetadata.reset();
    startDownload.reset();
    startPlaylistDownload.reset();
  };

  const showSingleProgress = Boolean(activeJobId) && !activePlaylistId;
  const showPlaylistProgress = Boolean(activePlaylistId);
  const canStartSingle = Boolean(
    metadata && selection && !startDownload.isPending,
  );

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

          {playlistDetected && !activePlaylistId && (
            <PlaylistModeChooser
              mode={mode}
              onChange={setMode}
              playlistCount={playlistMetadata?.totalItems}
              isLoading={fetchPlaylistMetadata.isPending}
            />
          )}

          {mode === 'SINGLE' && (
            <>
              <QualitySelector metadata={metadata} />
              <TrimSelector metadata={metadata} />

              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={handleStart}
                  disabled={!canStartSingle}
                >
                  <Download className="h-4 w-4" />
                  {startDownload.isPending
                    ? 'Starting...'
                    : 'Start download'}
                </Button>
                <Button variant="outline" size="lg" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" />
                  Start over
                </Button>
              </div>
            </>
          )}

          {mode === 'PLAYLIST' && (
            <>
              {fetchPlaylistMetadata.isPending && !playlistMetadata && (
                <Card className="border-border/60 bg-card/80">
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Loading playlist items...
                  </CardContent>
                </Card>
              )}

              {playlistMetadata && !activePlaylistId && (
                <PlaylistSelector
                  playlist={playlistMetadata}
                  isStartPending={startPlaylistDownload.isPending}
                  onStart={handleStartPlaylist}
                />
              )}

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="lg" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" />
                  Start over
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {showSingleProgress && activeJobId && (
        <ProgressCard
          jobId={activeJobId}
          onDismiss={() => setActiveJobId(null)}
        />
      )}

      {showPlaylistProgress && activePlaylistId && (
        <PlaylistProgressCard
          playlistId={activePlaylistId}
          onDismiss={() => setActivePlaylistId(null)}
        />
      )}
    </div>
  );
}
