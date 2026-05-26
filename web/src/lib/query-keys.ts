export const queryKeys = {
  metadata: (url: string) => ['metadata', url] as const,
  downloadStatus: (id: string) => ['download-status', id] as const,
  health: ['health'] as const,
  imageJob: (id: string) => ['image-job', id] as const,
  imageJobs: ['image-jobs'] as const,
} as const;
