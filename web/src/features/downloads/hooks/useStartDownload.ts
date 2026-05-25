'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { downloadService } from '@/services/download/download.service';
import { useDownloadHistoryStore, useDownloadUiStore } from '@/store/download.store';
import type { ApiError, StartDownloadPayload } from '@/types/api';

export function useStartDownload() {
  const setActiveJobId = useDownloadUiStore((s) => s.setActiveJobId);
  const upsertItem = useDownloadHistoryStore((s) => s.upsertItem);

  return useMutation({
    mutationFn: (payload: StartDownloadPayload) =>
      downloadService.startDownload(payload),
    onSuccess: (data, variables) => {
      setActiveJobId(data.downloadJobId);
      upsertItem({
        id: data.downloadJobId,
        videoId: variables.videoId,
        title: 'Downloading...',
        url: '',
        quality: variables.quality,
        mediaType: variables.mediaType ?? 'VIDEO',
        status: data.status,
        progress: 0,
        createdAt: new Date().toISOString(),
      });
      toast.success('Download started');
    },
    onError: (error: ApiError) => {
      toast.error(error.message ?? 'Failed to start download');
    },
  });
}
