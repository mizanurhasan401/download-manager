import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobKind, MediaType } from '@prisma/client';
import { Request, Response } from 'express';
import { createReadStream, promises as fs } from 'fs';
import { StreamableFile } from '@nestjs/common';
import { QUEUE_NAMES } from '../../common/constants';
import {
  BusinessException,
  DownloadNotFoundException,
  DownloadNotReadyException,
} from '../../common/exceptions/business.exception';
import { DownloadJobPayload } from '../../common/interfaces';
import { LocalStorageService } from '../../common/services/local-storage.service';
import { serializeBigInt } from '../../common/utils';
import { DownloadRepository } from './repositories/download.repository';
import { VideoRepository } from '../videos/repositories/video.repository';
import { StartDownloadDto } from './dto/start-download.dto';
import {
  DownloadProgressEvent,
  DownloadProgressService,
} from './services/download-progress.service';

@Injectable()
export class DownloadsService {
  private readonly logger = new Logger(DownloadsService.name);

  constructor(
    private readonly downloadRepository: DownloadRepository,
    private readonly videoRepository: VideoRepository,
    private readonly storageService: LocalStorageService,
    private readonly progressService: DownloadProgressService,
    @InjectQueue(QUEUE_NAMES.VIDEO_DOWNLOAD)
    private readonly downloadQueue: Queue<DownloadJobPayload>,
  ) {}

  async startDownload(dto: StartDownloadDto) {
    const video = await this.videoRepository.findById(dto.videoId);
    if (!video) {
      throw new DownloadNotFoundException('Video not found');
    }

    const clip = this.normalizeClipRange(
      dto.clipStartSeconds,
      dto.clipEndSeconds,
      video.duration ?? undefined,
    );

    const job = await this.downloadRepository.create({
      videoId: dto.videoId,
      formatId: dto.formatId,
      quality: dto.quality,
      mediaType: dto.mediaType ?? MediaType.VIDEO,
      audioBitrate: dto.audioBitrate,
      clipStartSeconds: clip?.startSec,
      clipEndSeconds: clip?.endSec,
      jobKind: clip ? JobKind.CLIP : JobKind.SINGLE,
    });

    const payload: DownloadJobPayload = {
      downloadJobId: job.id,
      videoUrl: video.url,
      formatId: dto.formatId,
      mediaType: dto.mediaType ?? MediaType.VIDEO,
      title: video.title ?? undefined,
      audioBitrate: dto.audioBitrate,
      clipStartSeconds: clip?.startSec,
      clipEndSeconds: clip?.endSec,
    };

    const queueJob = await this.downloadQueue.add('process-download', payload, {
      jobId: job.id,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    await this.downloadRepository.markQueued(job.id, queueJob.id ?? job.id);

    this.logger.log(`Download job ${job.id} queued`);

    return {
      downloadJobId: job.id,
      status: 'QUEUED',
      message: 'Download job has been queued for processing',
    };
  }

  async getStatus(id: string) {
    const job = await this.downloadRepository.findById(id);
    if (!job) {
      throw new DownloadNotFoundException();
    }

    const serialized = serializeBigInt(job);

    return {
      ...serialized,
      downloadUrl:
        job.status === 'COMPLETED'
          ? this.storageService.getPublicFileUrl(job.id)
          : null,
    };
  }

  async getProgressSnapshot(id: string): Promise<DownloadProgressEvent> {
    const cached = this.progressService.getLatest(id);
    if (cached) return cached;

    const job = await this.downloadRepository.findById(id);
    if (!job) {
      throw new DownloadNotFoundException();
    }

    const isCompleted = job.status === 'COMPLETED';
    const isFailed = job.status === 'FAILED' || job.status === 'CANCELLED';

    return {
      jobId: id,
      status: isCompleted ? 'completed' : isFailed ? 'failed' : 'progress',
      percent: job.progress,
      phase: isCompleted
        ? 'FINISHED'
        : isFailed
          ? 'FINISHED'
          : 'DOWNLOADING',
      phaseLabel: isCompleted
        ? 'Completed'
        : isFailed
          ? 'Failed'
          : (job.status as string),
      errorMessage: job.errorMessage ?? undefined,
      timestamp: Date.now(),
    };
  }

  async streamFile(id: string, response: Response, request: Request) {
    const job = await this.downloadRepository.findById(id);
    if (!job) {
      throw new DownloadNotFoundException();
    }

    if (job.status !== 'COMPLETED' || !job.filePath) {
      throw new DownloadNotReadyException();
    }

    const fileInfo = await this.storageService.getFileInfo(job.filePath);
    const stat = await fs.stat(job.filePath);
    const fileSize = stat.size;
    const fileName = job.fileName ?? fileInfo.fileName;
    const inline = request.query.inline === 'true';
    const disposition = inline
      ? `inline; filename="${fileName}"`
      : `attachment; filename="${fileName}"`;

    response.setHeader('Content-Type', fileInfo.mimeType);
    response.setHeader('Content-Disposition', disposition);
    response.setHeader('Accept-Ranges', 'bytes');
    response.setHeader('Cache-Control', 'private, max-age=3600');

    const range = request.headers.range;

    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        if (start >= fileSize || end >= fileSize) {
          response.status(416);
          response.setHeader('Content-Range', `bytes */${fileSize}`);
          return;
        }

        response.status(206);
        response.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        response.setHeader('Content-Length', chunkSize);

        return new StreamableFile(
          createReadStream(job.filePath, { start, end }),
        );
      }
    }

    response.setHeader('Content-Length', fileSize);

    return this.storageService.createReadStream(job.filePath);
  }

  async retryDownload(id: string) {
    const job = await this.downloadRepository.findById(id);
    if (!job) {
      throw new DownloadNotFoundException();
    }

    if (!['FAILED', 'CANCELLED'].includes(job.status)) {
      throw new DownloadNotReadyException(
        `Only failed or cancelled jobs can be retried (current: ${job.status})`,
      );
    }

    if (job.queueJobId) {
      const previousQueueJob = await this.downloadQueue.getJob(job.queueJobId);
      if (previousQueueJob) {
        await previousQueueJob.remove();
      }
    }

    const reset = await this.downloadRepository.resetForRetry(id);

    const payload: DownloadJobPayload = {
      downloadJobId: reset.id,
      videoUrl: job.video.url,
      formatId: reset.formatId,
      mediaType: reset.mediaType,
      title: job.video.title ?? undefined,
      audioBitrate: reset.audioBitrate ?? undefined,
      clipStartSeconds: reset.clipStartSeconds ?? undefined,
      clipEndSeconds: reset.clipEndSeconds ?? undefined,
    };

    const queueJob = await this.downloadQueue.add('process-download', payload, {
      jobId: `${reset.id}:retry:${reset.attemptCount}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    await this.downloadRepository.markQueued(reset.id, queueJob.id ?? reset.id);

    this.logger.log(
      `Download job ${reset.id} re-queued (attempt #${reset.attemptCount})`,
    );

    return {
      downloadJobId: reset.id,
      status: 'QUEUED' as const,
      attempt: reset.attemptCount,
      message: 'Download job has been re-queued',
    };
  }

  private normalizeClipRange(
    rawStart?: number,
    rawEnd?: number,
    videoDuration?: number,
  ): { startSec: number; endSec: number } | null {
    const hasStart = typeof rawStart === 'number' && Number.isFinite(rawStart);
    const hasEnd = typeof rawEnd === 'number' && Number.isFinite(rawEnd);

    if (!hasStart && !hasEnd) return null;

    const startSec = hasStart ? Math.max(0, rawStart as number) : 0;
    const endSec = hasEnd
      ? (rawEnd as number)
      : (videoDuration ?? startSec + 1);

    if (endSec <= startSec) {
      throw new BusinessException(
        'Clip end time must be greater than start time',
      );
    }

    if (
      typeof videoDuration === 'number' &&
      videoDuration > 0 &&
      endSec > videoDuration + 0.5
    ) {
      throw new BusinessException(
        `Clip end time (${endSec.toFixed(1)}s) exceeds video duration (${videoDuration.toFixed(1)}s)`,
      );
    }

    if (
      typeof videoDuration === 'number' &&
      videoDuration > 0 &&
      startSec === 0 &&
      endSec >= videoDuration - 0.5
    ) {
      return null;
    }

    return { startSec, endSec };
  }

  async cancelDownload(id: string) {
    const job = await this.downloadRepository.findById(id);
    if (!job) {
      throw new DownloadNotFoundException();
    }

    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status)) {
      return {
        downloadJobId: id,
        status: job.status,
        message: `Download is already ${job.status.toLowerCase()}`,
      };
    }

    if (job.queueJobId) {
      const queueJob = await this.downloadQueue.getJob(job.queueJobId);
      if (queueJob) {
        await queueJob.remove();
      }
    }

    if (job.filePath) {
      await this.storageService.deleteFile(job.filePath);
    }

    const cancelled = await this.downloadRepository.markCancelled(id);

    return {
      downloadJobId: cancelled.id,
      status: cancelled.status,
      message: 'Download cancelled successfully',
    };
  }
}
