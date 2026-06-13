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
import { FileJobsPersistenceModule } from './modules/file-converter/file-jobs-persistence.module';
import { ImageConvertProcessor } from './modules/queue/processors/image-convert.processor';
import { DocumentConvertProcessor } from './modules/queue/processors/document-convert.processor';

/**
 * Root module for the file conversion WORKER process — no HTTP controllers,
 * only the BullMQ processors (Sharp image + LibreOffice document) and their
 * dependencies. Conversions run here so the HTTP process stays responsive.
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
      { name: QUEUE_NAMES.IMAGE_CONVERT },
      { name: QUEUE_NAMES.DOCUMENT_CONVERT },
    ),
    PrismaModule,
    StorageModule,
    ProcessingModule,
    FileJobsPersistenceModule,
  ],
  providers: [ImageConvertProcessor, DocumentConvertProcessor],
})
export class WorkerModule {}
