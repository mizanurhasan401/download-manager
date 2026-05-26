import axios, { AxiosError, AxiosInstance } from 'axios';
import { env } from '@/config/env';
import type { ApiError, ApiResponse } from '@/types/api';

export const imageApiClient: AxiosInstance = axios.create({
  baseURL: env.imageApiUrl,
  timeout: 180_000,
});

imageApiClient.interceptors.response.use(
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

export async function unwrapImageResponse<T>(
  promise: Promise<{ data: ApiResponse<T> }>,
): Promise<T> {
  const { data } = await promise;
  if (!data.success) {
    throw { message: data.message ?? 'Request failed' } satisfies ApiError;
  }
  return data.data as T;
}
