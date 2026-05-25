import { apiClient, unwrapApiResponse } from '@/services/api/client';
import type {
  DownloadJobStatus,
  HealthCheckResult,
  StartDownloadPayload,
  StartDownloadResult,
} from '@/types/api';

export const downloadService = {
  startDownload(payload: StartDownloadPayload) {
    return unwrapApiResponse<StartDownloadResult>(
      apiClient.post('/downloads/start', payload),
    );
  },

  getStatus(id: string) {
    return unwrapApiResponse<DownloadJobStatus>(
      apiClient.get(`/downloads/status/${id}`),
    );
  },

  cancelDownload(id: string) {
    return unwrapApiResponse<{ downloadJobId: string; status: string; message: string }>(
      apiClient.delete(`/downloads/${id}`),
    );
  },

  retryDownload(id: string) {
    return unwrapApiResponse<{
      downloadJobId: string;
      status: string;
      attempt: number;
      message: string;
    }>(apiClient.post(`/downloads/${id}/retry`));
  },

  getHealth() {
    return unwrapApiResponse<HealthCheckResult>(apiClient.get('/health'));
  },
};
