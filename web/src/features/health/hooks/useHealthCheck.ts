'use client';

import { useQuery } from '@tanstack/react-query';
import { QUERY_STALE_TIME } from '@/constants';
import { queryKeys } from '@/lib/query-keys';
import { downloadService } from '@/services/download/download.service';

export function useHealthCheck() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: downloadService.getHealth,
    staleTime: QUERY_STALE_TIME.health,
    refetchInterval: 60_000,
    retry: 1,
  });
}
