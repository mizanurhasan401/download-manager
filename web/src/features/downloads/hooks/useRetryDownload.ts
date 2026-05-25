'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { downloadService } from '@/services/download/download.service';
import type { ApiError } from '@/types/api';

export function useRetryDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => downloadService.retryDownload(jobId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.downloadStatus(data.downloadJobId),
      });
      toast.success(`Retrying download (attempt #${data.attempt})`);
    },
    onError: (error: ApiError) => {
      toast.error(error.message ?? 'Failed to retry download');
    },
  });
}
