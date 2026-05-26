import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  host: process.env.HOST ?? 'localhost',
  port: parseInt(process.env.PORT ?? '3200', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  get baseUrl(): string {
    return `http://${process.env.HOST ?? 'localhost'}:${process.env.PORT ?? '3200'}`;
  },
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL!,
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
}));

export const storageConfig = registerAs('storage', () => ({
  path: process.env.STORAGE_PATH ?? './storage',
}));

export const processingConfig = registerAs('processing', () => ({
  maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '50', 10),
  imageConcurrency: parseInt(
    process.env.IMAGE_CONVERSION_CONCURRENCY ?? '4',
    10,
  ),
  documentConcurrency: parseInt(
    process.env.DOCUMENT_CONVERSION_CONCURRENCY ?? '1',
    10,
  ),
  jobTtlHours: parseInt(process.env.JOB_TTL_HOURS ?? '24', 10),
  libreOfficeBin: process.env.LIBREOFFICE_BIN ?? 'libreoffice',
  libreOfficeTimeoutMs: parseInt(
    process.env.LIBREOFFICE_TIMEOUT_MS ?? '120000',
    10,
  ),
}));

export const throttleConfig = registerAs('throttle', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT ?? '60', 10),
}));

export const loggerConfig = registerAs('logger', () => ({
  level: process.env.LOG_LEVEL ?? 'info',
}));
