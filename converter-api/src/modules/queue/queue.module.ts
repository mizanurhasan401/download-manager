import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from '../../common/constants';

/**
 * HTTP-facing queue wiring: BullMQ connection + queue registration so request
 * handlers can ENQUEUE conversion jobs. Processors run in the separate worker
 * process (see src/worker.module.ts), keeping LibreOffice / Sharp work off the
 * HTTP event loop.
 */
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
  ],
  exports: [BullModule],
})
export class QueueModule {}
