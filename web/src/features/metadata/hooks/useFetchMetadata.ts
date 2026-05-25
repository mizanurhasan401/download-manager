'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { metadataService } from '@/services/metadata/metadata.service';
import type { ApiError } from '@/types/api';

export function useFetchMetadata() {
  return useMutation({
    mutationFn: metadataService.fetchMetadata,
    onError: (error: ApiError) => {
      toast.error(error.message ?? 'Failed to fetch metadata');
    },
  });
}
