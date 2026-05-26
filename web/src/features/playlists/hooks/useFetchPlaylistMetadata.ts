'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { playlistService } from '@/services/playlist/playlist.service';
import type { ApiError } from '@/types/api';

export function useFetchPlaylistMetadata() {
  return useMutation({
    mutationFn: playlistService.fetchMetadata,
    onError: (error: ApiError) => {
      toast.error(error.message ?? 'Failed to fetch playlist');
    },
  });
}
