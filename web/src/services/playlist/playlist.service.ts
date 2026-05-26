import { apiClient, unwrapApiResponse } from '@/services/api/client';
import type {
  FetchPlaylistMetadataPayload,
  PlaylistMetadata,
  StartPlaylistDownloadPayload,
  StartPlaylistDownloadResult,
} from '@/types/api';

export const playlistService = {
  fetchMetadata(payload: FetchPlaylistMetadataPayload) {
    return unwrapApiResponse<PlaylistMetadata>(
      apiClient.post('/playlists/metadata', payload),
    );
  },

  startDownloads(payload: StartPlaylistDownloadPayload) {
    return unwrapApiResponse<StartPlaylistDownloadResult>(
      apiClient.post('/playlists/start', payload),
    );
  },

  getPlaylist(id: string) {
    return unwrapApiResponse<PlaylistMetadata>(
      apiClient.get(`/playlists/${id}`),
    );
  },
};
