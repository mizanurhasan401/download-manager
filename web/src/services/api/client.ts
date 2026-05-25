import axios, { AxiosError, AxiosInstance } from 'axios';
import { env } from '@/config/env';
import type { ApiError, ApiResponse } from '@/types/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 120_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    const apiError: ApiError = {
      message:
        error.response?.data?.message ??
        error.message ??
        'An unexpected error occurred',
      status: error.response?.status,
    };

    return Promise.reject(apiError);
  },
);

export async function unwrapApiResponse<T>(
  promise: Promise<{ data: ApiResponse<T> }>,
): Promise<T> {
  const { data } = await promise;

  if (!data.success) {
    throw {
      message: data.message ?? 'Request failed',
    } satisfies ApiError;
  }

  return data.data as T;
}
