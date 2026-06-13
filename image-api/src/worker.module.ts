import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import {
  appConfig,
  databaseConfig,
  loggerConfig,
  processingConfig,
  redisConfig,
  storageConfig,
} from './config/configuration';
import { QUEUE_NAMES } from './common/constants';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './modules/storage/storage.module';
import { ProcessingModule } from './modules/processing/processing.module';
import { ImageJobsPersistenceModule } from './modules/images/image-jobs-persistence.module';
import { FastOpsProcessor } from './modules/queue/processors/fast-ops.processor';
import { BackgroundRemoveProcessor } from './modules/queue/processors/background-remove.processor';

/**
 * Root module for the image WORKER process — no HTTP controllers, only the
 * BullMQ processors (Sharp fast-ops + ML background removal) and their
 * dependencies. Keeping these off the HTTP process means uploads and status
 * polls stay instant even while a heavy job runs.
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
        processingConfig,
        loggerConfig,
      ],
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
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.IMAGE_FAST_OPS },
      { name: QUEUE_NAMES.IMAGE_BG_REMOVE },
    ),
    PrismaModule,
    StorageModule,
    ProcessingModule,
    ImageJobsPersistenceModule,
  ],
  providers: [FastOpsProcessor, BackgroundRemoveProcessor],
})
export class WorkerModule {}
