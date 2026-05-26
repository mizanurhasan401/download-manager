'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { imageJobsService } from '@/services/image-api/image-jobs.service';
import type { ImageJobStatus } from '@/types/image';

const ACTIVE_STATUSES: ImageJobStatus[] = ['PENDING', 'QUEUED', 'PROCESSING'];
const POLL_INTERVAL_MS = 1500;

export function useImageJob(jobId?: string | null) {
  return useQuery({
    queryKey: queryKeys.imageJob(jobId ?? 'none'),
    queryFn: () => imageJobsService.getJob(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (!status) return POLL_INTERVAL_MS;
      return ACTIVE_STATUSES.includes(status) ? POLL_INTERVAL_MS : false;
    },
  });
}
