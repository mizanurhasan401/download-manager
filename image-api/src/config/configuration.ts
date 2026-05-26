import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  host: process.env.HOST ?? 'localhost',
  port: parseInt(process.env.PORT ?? '3100', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  get baseUrl(): string {
    return `http://${process.env.HOST ?? 'localhost'}:${process.env.PORT ?? '3100'}`;
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
  maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '25', 10),
  maxInputPixels: parseInt(process.env.MAX_INPUT_PIXELS ?? '25000000', 10),
  fastOpsConcurrency: parseInt(process.env.FAST_OPS_CONCURRENCY ?? '5', 10),
  bgRemoveConcurrency: parseInt(process.env.BG_REMOVE_CONCURRENCY ?? '1', 10),
  jobTtlHours: parseInt(process.env.JOB_TTL_HOURS ?? '24', 10),
}));

export const throttleConfig = registerAs('throttle', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT ?? '60', 10),
}));

export const loggerConfig = registerAs('logger', () => ({
  level: process.env.LOG_LEVEL ?? 'info',
}));
