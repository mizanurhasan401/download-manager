import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import {
  appConfig,
  databaseConfig,
  downloaderConfig,
  loggerConfig,
  redisConfig,
  storageConfig,
} from './config/configuration';
import { validateConfig } from './config/validation.util';
import { EnvironmentVariables } from './config/env.validation';
import { QUEUE_NAMES } from './common/constants';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './modules/storage/storage.module';
import { VideosModule } from './modules/videos/videos.module';
import { DownloadPersistenceModule } from './modules/downloads/download-persistence.module';
import { PlaylistPersistenceModule } from './modules/playlists/playlist-persistence.module';
import { DownloadProcessor } from './modules/queue/processors/download.processor';

/**
 * Root module for the video download WORKER process. It carries no HTTP
 * controllers — only the BullMQ processor and the services it needs. Running
 * downloads here (yt-dlp + ffmpeg) keeps the HTTP process free to respond.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        storageConfig,
        downloaderConfig,
        loggerConfig,
      ],
      validate: (config) => validateConfig(config, EnvironmentVariables),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow<string>('redis.host'),
          port: configService.getOrThrow<number>('redis.port'),
        },
      }),
    }),
    BullModule.registerQueue({ name: QUEUE_NAMES.VIDEO_DOWNLOAD }),
    PrismaModule,
    StorageModule,
    VideosModule,
    DownloadPersistenceModule,
    PlaylistPersistenceModule,
  ],
  providers: [DownloadProcessor],
})
export class WorkerModule {}
