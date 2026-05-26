'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { imageJobsService } from '@/services/image-api/image-jobs.service';
import { queryKeys } from '@/lib/query-keys';
import type { ApiError } from '@/types/api';
import type { CreateImageJobBody, ImageJob } from '@/types/image';

interface CreateImageJobInput {
  file: File;
  body: CreateImageJobBody;
}

export function useCreateImageJob(onSuccess?: (job: ImageJob) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, body }: CreateImageJobInput) =>
      imageJobsService.createJob(file, body),
    onSuccess: (job) => {
      queryClient.setQueryData(queryKeys.imageJob(job.id), job);
      queryClient.invalidateQueries({ queryKey: queryKeys.imageJobs });
      toast.success('Image job started');
      onSuccess?.(job);
    },
    onError: (error: ApiError) => {
      toast.error(error.message ?? 'Failed to start image job');
    },
  });
}
