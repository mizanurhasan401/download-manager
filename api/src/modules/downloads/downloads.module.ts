import { Module } from '@nestjs/common';
import { DownloadsController } from './downloads.controller';
import { DownloadsService } from './downloads.service';
import { DownloadPersistenceModule } from './download-persistence.module';
import { VideosModule } from '../videos/videos.module';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';
import { DownloadProgressService } from './services/download-progress.service';

@Module({
  imports: [DownloadPersistenceModule, VideosModule, StorageModule, QueueModule],
  controllers: [DownloadsController],
  providers: [DownloadsService, DownloadProgressService],
  exports: [DownloadsService, DownloadProgressService],
})
export class DownloadsModule {}
