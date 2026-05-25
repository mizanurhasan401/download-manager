import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from '../../common/constants';
import { DownloadProcessor } from './processors/download.processor';
import { DownloadPersistenceModule } from '../downloads/download-persistence.module';
import { VideosModule } from '../videos/videos.module';

@Module({
  imports: [
    DownloadPersistenceModule,
    VideosModule,
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
  providers: [DownloadProcessor],
  exports: [BullModule],
})
export class QueueModule {}
