import { registerAs } from '@nestjs/config';
import { resolveDatabaseUrl } from './database-url.util';

export const appConfig = registerAs('app', () => ({
  host: process.env.HOST!,
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  get baseUrl(): string {
    return `http://${process.env.HOST}:${process.env.PORT ?? '3000'}`;
  },
}));

export const databaseConfig = registerAs('database', () => {
  const url = resolveDatabaseUrl();

  return {
    url,
    host: process.env.POSTGRES_HOST!,
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    user: process.env.POSTGRES_USER!,
    password: process.env.POSTGRES_PASSWORD!,
    database: process.env.POSTGRES_DB!,
    schema: process.env.POSTGRES_SCHEMA ?? 'public',
  };
});

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
}));

export const storageConfig = registerAs('storage', () => ({
  path: process.env.STORAGE_PATH ?? './storage',
}));

export const downloaderConfig = registerAs('downloader', () => ({
  ytdlpPath: process.env.YTDLP_PATH ?? 'yt-dlp',
  ffmpegPath: process.env.FFMPEG_PATH ?? 'ffmpeg',
  cookiesFile: process.env.YTDLP_COOKIES_FILE,
  proxy: process.env.YTDLP_PROXY,
  retries: parseInt(process.env.YTDLP_RETRIES ?? '3', 10),
  timeoutMs: parseInt(process.env.YTDLP_TIMEOUT_MS ?? '300000', 10),
  maxDownloadSizeMb: parseInt(process.env.MAX_DOWNLOAD_SIZE_MB ?? '2048', 10),
  maxConcurrentDownloads: parseInt(
    process.env.MAX_CONCURRENT_DOWNLOADS ?? '3',
    10,
  ),
}));

export const throttleConfig = registerAs('throttle', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
}));

export const loggerConfig = registerAs('logger', () => ({
  level: process.env.LOG_LEVEL ?? 'info',
}));
