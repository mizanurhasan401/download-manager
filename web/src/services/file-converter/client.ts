import axios, { AxiosError, AxiosInstance } from 'axios';
import { env } from '@/config/env';
import type { ApiError, ApiResponse } from '@/types/api';

export const fileConverterApiClient: AxiosInstance = axios.create({
  baseURL: env.fileConverterApiUrl,
  // Document conversions (LibreOffice) can take a while; keep this generous
  // but still finite so a hung backend surfaces as a frontend error.
  timeout: 300_000,
});

fileConverterApiClient.interceptors.response.use(
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

export async function unwrapFileConverterResponse<T>(
  promise: Promise<{ data: ApiResponse<T> }>,
): Promise<T> {
  const { data } = await promise;
  if (!data.success) {
    throw { message: data.message ?? 'Request failed' } satisfies ApiError;
  }
  return data.data as T;
}
