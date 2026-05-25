import { apiClient, unwrapApiResponse } from '@/services/api/client';
import type { VideoMetadata } from '@/types/api';

export interface FetchMetadataPayload {
  url: string;
}

export const metadataService = {
  fetchMetadata(payload: FetchMetadataPayload) {
    return unwrapApiResponse<VideoMetadata>(
      apiClient.post('/downloads/metadata', payload),
    );
  },
};
