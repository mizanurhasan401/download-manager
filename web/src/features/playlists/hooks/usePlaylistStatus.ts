'use client';

import { useQuery } from '@tanstack/react-query';
import { DOWNLOAD_POLL_INTERVAL_MS } from '@/constants';
import { playlistService } from '@/services/playlist/playlist.service';

export function usePlaylistStatus(playlistId: string | null | undefined) {
  return useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: () => playlistService.getPlaylist(playlistId as string),
    enabled: Boolean(playlistId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (
        status === 'COMPLETED' ||
        status === 'FAILED' ||
        status === 'PARTIALLY_COMPLETED' ||
        status === 'CANCELLED'
      ) {
        return false;
      }
      return DOWNLOAD_POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: false,
  });
}
