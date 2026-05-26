'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fileConverterService } from '@/services/file-converter/file-converter.service';

export function useConversionsList(limit = 25) {
  return useQuery({
    queryKey: queryKeys.fileConversionJobs,
    queryFn: () => fileConverterService.listJobs(limit),
    staleTime: 15_000,
  });
}
