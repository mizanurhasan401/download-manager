import { Module } from '@nestjs/common';
import { VideosService } from './videos.service';
import { VideoRepository } from './repositories/video.repository';
import { YtDlpService } from '../../common/services/ytdlp.service';

@Module({
  providers: [VideosService, VideoRepository, YtDlpService],
  exports: [VideosService, VideoRepository, YtDlpService],
})
export class VideosModule {}
