'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getYtDlpErrorMessage } from '@/lib/ytdlp-errors';
import { metadataService } from '@/services/metadata/metadata.service';
import type { ApiError } from '@/types/api';

export function useFetchMetadata() {
  return useMutation({
    mutationFn: metadataService.fetchMetadata,
    onError: (error: ApiError) => {
      toast.error(getYtDlpErrorMessage(error.message));
    },
  });
}
