import { env } from '@/config/env';
import type { CreateImageJobBody, ImageJob } from '@/types/image';
import { imageApiClient, unwrapImageResponse } from './client';

export const imageJobsService = {
  createJob(file: File, body: CreateImageJobBody): Promise<ImageJob> {
    const form = new FormData();
    form.append('file', file);
    form.append('operation', body.operation);
    if (body.format) form.append('format', body.format);
    if (body.quality !== undefined) form.append('quality', String(body.quality));
    if (body.width !== undefined) form.append('width', String(body.width));
    if (body.height !== undefined) form.append('height', String(body.height));
    if (body.fit) form.append('fit', body.fit);

    return unwrapImageResponse(
      imageApiClient.post('/images/jobs', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  },

  getJob(id: string): Promise<ImageJob> {
    return unwrapImageResponse(imageApiClient.get(`/images/jobs/${id}`));
  },

  listJobs(limit = 25): Promise<ImageJob[]> {
    return unwrapImageResponse(
      imageApiClient.get('/images/jobs', { params: { limit } }),
    );
  },

  deleteJob(id: string): Promise<void> {
    return unwrapImageResponse(imageApiClient.delete(`/images/jobs/${id}`));
  },

  buildFileUrl(id: string, type: 'original' | 'output' = 'output'): string {
    return `${env.imageApiUrl}/images/jobs/${id}/file?type=${type}`;
  },
};
