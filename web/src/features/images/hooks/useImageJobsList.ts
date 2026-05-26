'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { imageJobsService } from '@/services/image-api/image-jobs.service';

export function useImageJobsList(limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.imageJobs, limit] as const,
    queryFn: () => imageJobsService.listJobs(limit),
    staleTime: 10_000,
  });
}
