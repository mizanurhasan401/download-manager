import { Injectable, Logger } from '@nestjs/common';
import { VideoProvider, Prisma } from '@prisma/client';
import { YtDlpService } from '../../common/services/ytdlp.service';
import { YtDlpFormat } from '../../common/interfaces';
import { resolveProviderFromUrl } from '../../common/pipes/video-url-validation.pipe';
import { VideoRepository } from './repositories/video.repository';

export interface VideoMetadataResult {
  videoId: string;
  url: string;
  provider: VideoProvider;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: number;
  uploader?: string;
  formats: FormattedFormat[];
}

export interface FormattedFormat {
  formatId: string;
  ext: string;
  quality: string;
  resolution?: string;
  fileSize?: number;
  hasVideo: boolean;
  hasAudio: boolean;
  fps?: number;
  vcodec?: string;
  acodec?: string;
}

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    private readonly ytDlpService: YtDlpService,
    private readonly videoRepository: VideoRepository,
  ) {}

  async extractAndStoreMetadata(url: string): Promise<VideoMetadataResult> {
    this.logger.log(`Extracting metadata for URL: ${url}`);

    const metadata = await this.ytDlpService.extractMetadata(url);
    const provider = resolveProviderFromUrl(url) as VideoProvider;
    const formats = this.formatFormats(
      this.ytDlpService.getAvailableFormats(metadata),
    );

    const video = await this.videoRepository.upsertByUrl({
      url,
      provider,
      title: metadata.title,
      description: metadata.description,
      thumbnailUrl: metadata.thumbnail,
      duration: metadata.duration,
      uploader: metadata.uploader,
      metadata: metadata as unknown as Prisma.InputJsonValue,
    });

    return {
      videoId: video.id,
      url: video.url,
      provider: video.provider,
      title: metadata.title,
      description: metadata.description,
      thumbnailUrl: metadata.thumbnail,
      duration: metadata.duration,
      uploader: metadata.uploader,
      formats,
    };
  }

  private formatFormats(formats: YtDlpFormat[]): FormattedFormat[] {
    const seen = new Set<string>();

    const formatted = formats
      .filter((format) => {
        const key = `${format.format_id}-${format.ext}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((format) => {
        const hasVideo = Boolean(format.vcodec && format.vcodec !== 'none');
        const hasAudio = Boolean(format.acodec && format.acodec !== 'none');
        const qualityNote = format.format_note ?? format.resolution ?? format.ext;

        return {
          formatId: format.format_id,
          ext: format.ext,
          quality:
            hasVideo && !hasAudio
              ? `${qualityNote} (video + audio merged on download)`
              : qualityNote,
          resolution: format.resolution,
          fileSize: format.filesize,
          hasVideo,
          hasAudio,
          fps: format.fps,
          vcodec: format.vcodec,
          acodec: format.acodec,
        };
      });

    const combinedVideo = formatted.filter((format) => format.hasVideo && format.hasAudio);
    if (combinedVideo.length > 0) {
      return formatted.filter(
        (format) => !(format.hasVideo && !format.hasAudio),
      );
    }

    return formatted;
  }
}
