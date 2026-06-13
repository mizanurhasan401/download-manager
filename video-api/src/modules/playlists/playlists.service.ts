import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  JobKind,
  MediaType,
  PlaylistStatus,
  Prisma,
  VideoProvider,
} from '@prisma/client';
import { QUEUE_NAMES } from '../../common/constants';
import {
  BusinessException,
  DownloadNotFoundException,
} from '../../common/exceptions/business.exception';
import {
  DownloadJobPayload,
  YtDlpPlaylistEntry,
  YtDlpPlaylistMetadata,
} from '../../common/interfaces';
import { resolveProviderFromUrl } from '../../common/pipes/video-url-validation.pipe';
import { YtDlpService } from '../../common/services/ytdlp.service';
import { DownloadRepository } from '../downloads/repositories/download.repository';
import { VideoRepository } from '../videos/repositories/video.repository';
import {
  PlaylistQualityPreference,
  StartPlaylistDownloadDto,
} from './dto/start-playlist-download.dto';
import {
  PlaylistRepository,
  PlaylistWithItems,
} from './repositories/playlist.repository';

interface ResolvedFormat {
  formatId: string;
  quality: string;
  mediaType: MediaType;
}

const QUALITY_FORMAT_MAP: Record<PlaylistQualityPreference, ResolvedFormat> = {
  [PlaylistQualityPreference.BEST]: {
    formatId: 'bestvideo+bestaudio/best',
    quality: 'Best',
    mediaType: MediaType.VIDEO,
  },
  [PlaylistQualityPreference.Q_2160P]: {
    formatId: 'bestvideo[height<=2160]+bestaudio/best[height<=2160]',
    quality: '2160p',
    mediaType: MediaType.VIDEO,
  },
  [PlaylistQualityPreference.Q_1440P]: {
    formatId: 'bestvideo[height<=1440]+bestaudio/best[height<=1440]',
    quality: '1440p',
    mediaType: MediaType.VIDEO,
  },
  [PlaylistQualityPreference.Q_1080P]: {
    formatId: 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
    quality: '1080p',
    mediaType: MediaType.VIDEO,
  },
  [PlaylistQualityPreference.Q_720P]: {
    formatId: 'bestvideo[height<=720]+bestaudio/best[height<=720]',
    quality: '720p',
    mediaType: MediaType.VIDEO,
  },
  [PlaylistQualityPreference.Q_480P]: {
    formatId: 'bestvideo[height<=480]+bestaudio/best[height<=480]',
    quality: '480p',
    mediaType: MediaType.VIDEO,
  },
  [PlaylistQualityPreference.AUDIO_MP3]: {
    formatId: 'bestaudio/best',
    quality: 'MP3 audio',
    mediaType: MediaType.AUDIO,
  },
};

@Injectable()
export class PlaylistsService {
  private readonly logger = new Logger(PlaylistsService.name);

  constructor(
    private readonly playlistRepository: PlaylistRepository,
    private readonly videoRepository: VideoRepository,
    private readonly downloadRepository: DownloadRepository,
    private readonly ytDlpService: YtDlpService,
    @InjectQueue(QUEUE_NAMES.VIDEO_DOWNLOAD)
    private readonly downloadQueue: Queue<DownloadJobPayload>,
  ) {}

  async fetchAndStoreMetadata(
    url: string,
    maxItems = 100,
  ): Promise<PlaylistWithItems> {
    this.logger.log(`Extracting playlist metadata for: ${url}`);

    const metadata = await this.ytDlpService.extractPlaylistMetadata(url, {
      maxItems,
    });

    const provider = resolveProviderFromUrl(url) as VideoProvider;
    const entries = metadata.entries ?? [];

    if (entries.length === 0) {
      throw new BusinessException('Playlist contains no entries');
    }

    const items = entries.map((entry, index) => ({
      position: index + 1,
      videoUrl: this.normalizeEntryUrl(entry, provider),
      title: entry.title ?? `Untitled ${index + 1}`,
      duration:
        typeof entry.duration === 'number' && Number.isFinite(entry.duration)
          ? Math.floor(entry.duration)
          : undefined,
      thumbnailUrl: this.pickThumbnail(entry),
      metadata: entry as unknown as Prisma.InputJsonValue,
    }));

    return this.playlistRepository.upsertWithItems(
      {
        sourceUrl: url,
        provider,
        title: metadata.title,
        uploader: metadata.uploader,
        totalItems: items.length,
        metadata: metadata as unknown as Prisma.InputJsonValue,
      },
      items,
    );
  }

  async getPlaylist(id: string): Promise<PlaylistWithItems> {
    const playlist = await this.playlistRepository.findByIdWithItems(id);
    if (!playlist) {
      throw new DownloadNotFoundException('Playlist not found');
    }
    return playlist;
  }

  async startDownloads(dto: StartPlaylistDownloadDto) {
    const playlist = await this.playlistRepository.findByIdWithItems(
      dto.playlistId,
    );
    if (!playlist) {
      throw new DownloadNotFoundException('Playlist not found');
    }

    const selectedItems = await this.playlistRepository.findItemsByIds(
      dto.playlistId,
      dto.itemIds,
    );

    if (selectedItems.length === 0) {
      throw new BusinessException('No selectable playlist items provided');
    }

    const resolved = QUALITY_FORMAT_MAP[dto.qualityPreference];
    const enqueued: Array<{
      itemId: string;
      downloadJobId: string;
      videoUrl: string;
    }> = [];

    await this.playlistRepository.updateStatus(
      playlist.id,
      PlaylistStatus.PROCESSING,
      { selectedItems: selectedItems.length },
    );

    for (const item of selectedItems) {
      const video = await this.videoRepository.upsertByUrl({
        url: item.videoUrl,
        provider: playlist.provider,
        title: item.title ?? undefined,
        thumbnailUrl: item.thumbnailUrl ?? undefined,
        duration: item.duration ?? undefined,
      });

      const job = await this.downloadRepository.create({
        videoId: video.id,
        formatId: resolved.formatId,
        quality: resolved.quality,
        mediaType: resolved.mediaType,
        audioBitrate:
          resolved.mediaType === MediaType.AUDIO
            ? (dto.audioBitrate ?? 192)
            : undefined,
        jobKind: JobKind.PLAYLIST_ITEM,
        playlistId: playlist.id,
      });

      const payload: DownloadJobPayload = {
        downloadJobId: job.id,
        videoUrl: video.url,
        formatId: resolved.formatId,
        mediaType: resolved.mediaType,
        title: video.title ?? item.title ?? undefined,
        audioBitrate:
          resolved.mediaType === MediaType.AUDIO
            ? (dto.audioBitrate ?? 192)
            : undefined,
      };

      const queueJob = await this.downloadQueue.add(
        'process-download',
        payload,
        {
          jobId: job.id,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );

      await this.downloadRepository.markQueued(job.id, queueJob.id ?? job.id);

      enqueued.push({
        itemId: item.id,
        downloadJobId: job.id,
        videoUrl: video.url,
      });
    }

    this.logger.log(
      `Playlist ${playlist.id}: enqueued ${enqueued.length} download jobs`,
    );

    return {
      playlistId: playlist.id,
      totalSelected: selectedItems.length,
      enqueued,
      status: PlaylistStatus.PROCESSING,
    };
  }

  async recomputeStatus(playlistId: string): Promise<void> {
    const counts =
      await this.downloadRepository.countByPlaylistAndStatus(playlistId);
    const total = Object.values(counts).reduce((acc, n) => acc + n, 0);
    if (total === 0) return;

    const completed = counts.COMPLETED;
    const failed = counts.FAILED + counts.CANCELLED;
    const inFlight = counts.PENDING + counts.QUEUED + counts.PROCESSING + counts.MERGING;

    let next: PlaylistStatus;
    if (inFlight > 0) {
      next = PlaylistStatus.PROCESSING;
    } else if (completed === total) {
      next = PlaylistStatus.COMPLETED;
    } else if (failed === total) {
      next = PlaylistStatus.FAILED;
    } else {
      next = PlaylistStatus.PARTIALLY_COMPLETED;
    }

    await this.playlistRepository.updateStatus(playlistId, next);
  }

  private normalizeEntryUrl(
    entry: YtDlpPlaylistEntry,
    provider: VideoProvider,
  ): string {
    if (entry.webpage_url) return entry.webpage_url;
    if (entry.url && /^https?:\/\//i.test(entry.url)) return entry.url;

    const id = entry.id ?? entry.url;
    if (!id) return entry.url ?? '';

    switch (provider) {
      case VideoProvider.YOUTUBE:
        return `https://www.youtube.com/watch?v=${id}`;
      case VideoProvider.VIMEO:
        return `https://vimeo.com/${id}`;
      default:
        return entry.url ?? id;
    }
  }

  private pickThumbnail(entry: YtDlpPlaylistEntry): string | undefined {
    if (entry.thumbnail) return entry.thumbnail;
    if (entry.thumbnails && entry.thumbnails.length > 0) {
      return entry.thumbnails[entry.thumbnails.length - 1].url;
    }
    return undefined;
  }
}
