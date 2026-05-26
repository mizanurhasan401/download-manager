import { env } from '@/config/env';
import type {
  ConversionJob,
  CreateConversionBody,
} from '@/types/file-converter';
import {
  fileConverterApiClient,
  unwrapFileConverterResponse,
} from './client';

export const fileConverterService = {
  createConversion(
    file: File,
    body: CreateConversionBody,
  ): Promise<ConversionJob> {
    const form = new FormData();
    form.append('file', file);
    form.append('targetFormat', body.targetFormat);
    if (body.quality !== undefined) {
      form.append('quality', String(body.quality));
    }

    return unwrapFileConverterResponse(
      fileConverterApiClient.post('/file-converter/convert', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  },

  getStatus(id: string): Promise<ConversionJob> {
    return unwrapFileConverterResponse(
      fileConverterApiClient.get(`/file-converter/status/${id}`),
    );
  },

  listJobs(limit = 25): Promise<ConversionJob[]> {
    return unwrapFileConverterResponse(
      fileConverterApiClient.get('/file-converter', { params: { limit } }),
    );
  },

  deleteJob(id: string): Promise<void> {
    return unwrapFileConverterResponse(
      fileConverterApiClient.delete(`/file-converter/${id}`),
    );
  },

  buildFileUrl(id: string, type: 'original' | 'output' = 'output'): string {
    return `${env.fileConverterApiUrl}/file-converter/file/${id}?type=${type}`;
  },

  buildProgressStreamUrl(id: string): string {
    return `${env.fileConverterApiUrl}/file-converter/progress/${id}`;
  },
};
