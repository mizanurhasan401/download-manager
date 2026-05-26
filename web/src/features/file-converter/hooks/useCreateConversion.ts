'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { fileConverterService } from '@/services/file-converter/file-converter.service';
import type { ApiError } from '@/types/api';
import type {
  ConversionJob,
  CreateConversionBody,
} from '@/types/file-converter';

interface CreateConversionInput {
  file: File;
  body: CreateConversionBody;
}

export function useCreateConversion(
  onSuccess?: (job: ConversionJob) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, body }: CreateConversionInput) =>
      fileConverterService.createConversion(file, body),
    onSuccess: (job) => {
      queryClient.setQueryData(queryKeys.fileConversionJob(job.id), job);
      queryClient.invalidateQueries({ queryKey: queryKeys.fileConversionJobs });
      toast.success('Conversion started');
      onSuccess?.(job);
    },
    onError: (error: ApiError) => {
      toast.error(error.message ?? 'Failed to start conversion');
    },
  });
}
