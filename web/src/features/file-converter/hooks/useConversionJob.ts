'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fileConverterService } from '@/services/file-converter/file-converter.service';
import type { ConversionJobStatus } from '@/types/file-converter';

const ACTIVE_STATUSES: ConversionJobStatus[] = [
  'PENDING',
  'QUEUED',
  'PROCESSING',
  'CONVERTING',
];

/**
 * Backup polling for the conversion job record. The SSE stream is the primary
 * source of progress, but this query keeps the cached job (with file URLs,
 * status, error message) fresh — refetching slowly while active and not at all
 * once it terminates.
 */
const POLL_INTERVAL_MS = 4000;

export function useConversionJob(jobId?: string | null) {
  return useQuery({
    queryKey: queryKeys.fileConversionJob(jobId ?? 'none'),
    queryFn: () => fileConverterService.getStatus(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (!status) return POLL_INTERVAL_MS;
      return ACTIVE_STATUSES.includes(status) ? POLL_INTERVAL_MS : false;
    },
  });
}
