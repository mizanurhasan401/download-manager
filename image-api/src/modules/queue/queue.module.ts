import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from '../../common/constants';
import { ImageJobsPersistenceModule } from '../images/image-jobs-persistence.module';
import { FastOpsProcessor } from './processors/fast-ops.processor';
import { BackgroundRemoveProcessor } from './processors/background-remove.processor';

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
        name: QUEUE_NAMES.IMAGE_FAST_OPS,
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 3600, count: 200 },
          removeOnFail: { age: 86_400, count: 200 },
        },
      },
      {
        name: QUEUE_NAMES.IMAGE_BG_REMOVE,
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: { age: 3600, count: 100 },
          removeOnFail: { age: 86_400, count: 100 },
        },
      },
    ),
    ImageJobsPersistenceModule,
  ],
  providers: [FastOpsProcessor, BackgroundRemoveProcessor],
  exports: [BullModule],
})
export class QueueModule {}
