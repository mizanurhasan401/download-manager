'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { playlistService } from '@/services/playlist/playlist.service';
import type { ApiError } from '@/types/api';

export function useStartPlaylistDownload() {
  return useMutation({
    mutationFn: playlistService.startDownloads,
    onSuccess: (data) => {
      toast.success(
        `${data.totalSelected} download${
          data.totalSelected === 1 ? '' : 's'
        } queued`,
      );
    },
    onError: (error: ApiError) => {
      toast.error(error.message ?? 'Failed to start playlist downloads');
    },
  });
}
