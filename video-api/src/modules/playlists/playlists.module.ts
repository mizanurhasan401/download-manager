import { Module } from '@nestjs/common';
import { DownloadPersistenceModule } from '../downloads/download-persistence.module';
import { QueueModule } from '../queue/queue.module';
import { VideosModule } from '../videos/videos.module';
import { PlaylistPersistenceModule } from './playlist-persistence.module';
import { PlaylistsController } from './playlists.controller';
import { PlaylistsService } from './playlists.service';

@Module({
  imports: [
    PlaylistPersistenceModule,
    DownloadPersistenceModule,
    VideosModule,
    QueueModule,
  ],
  controllers: [PlaylistsController],
  providers: [PlaylistsService],
  exports: [PlaylistsService],
})
export class PlaylistsModule {}
