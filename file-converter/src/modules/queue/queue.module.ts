import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from '../../common/constants';
import { FileConverterModule } from '../file-converter/file-converter.module';
import { FileJobsPersistenceModule } from '../file-converter/file-jobs-persistence.module';
import { DocumentConvertProcessor } from './processors/document-convert.processor';
import { ImageConvertProcessor } from './processors/image-convert.processor';

@Module({
  imports: [
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
      {
        name: QUEUE_NAMES.IMAGE_CONVERT,
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 3600, count: 200 },
          removeOnFail: { age: 86_400, count: 200 },
        },
      },
      {
        name: QUEUE_NAMES.DOCUMENT_CONVERT,
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: { age: 3600, count: 200 },
          removeOnFail: { age: 86_400, count: 200 },
        },
      },
    ),
    FileJobsPersistenceModule,
    FileConverterModule,
  ],
  providers: [ImageConvertProcessor, DocumentConvertProcessor],
  exports: [BullModule],
})
export class QueueModule {}
