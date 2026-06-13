import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from '../../common/constants';

/**
 * HTTP-facing queue wiring: registers the BullMQ connection and the video
 * download queue so request handlers can ENQUEUE jobs. Job consumption lives
 * in the separate worker process (see src/worker.module.ts) — the HTTP process
 * never runs processors, so heavy downloads can never block request handling.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow<string>('redis.host'),
          port: configService.getOrThrow<number>('redis.port'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }),
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.VIDEO_DOWNLOAD,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
