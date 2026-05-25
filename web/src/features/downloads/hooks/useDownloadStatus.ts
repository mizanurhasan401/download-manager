'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { DOWNLOAD_POLL_INTERVAL_MS } from '@/constants';
import { queryKeys } from '@/lib/query-keys';
import { downloadService } from '@/services/download/download.service';
import { useDownloadHistoryStore } from '@/store/download.store';
import type { DownloadStatus } from '@/types/api';

const ACTIVE_STATUSES: DownloadStatus[] = [
  'PENDING',
  'QUEUED',
  'PROCESSING',
  'MERGING',
];

export function useDownloadStatus(jobId?: string | null) {
  const updateItem = useDownloadHistoryStore((s) => s.updateItem);

  const query = useQuery({
    queryKey: queryKeys.downloadStatus(jobId ?? 'none'),
    queryFn: () => downloadService.getStatus(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (!status) return DOWNLOAD_POLL_INTERVAL_MS;
      return ACTIVE_STATUSES.includes(status) ? DOWNLOAD_POLL_INTERVAL_MS : false;
    },
  });

  useEffect(() => {
    if (!query.data) return;

    updateItem(query.data.id, {
      status: query.data.status,
      progress: query.data.progress,
      title: query.data.video?.title ?? 'Video',
      thumbnailUrl: query.data.video?.thumbnailUrl ?? undefined,
      url: query.data.video?.url ?? '',
      errorMessage: query.data.errorMessage ?? undefined,
    });
  }, [query.data, updateItem]);

  return query;
}
