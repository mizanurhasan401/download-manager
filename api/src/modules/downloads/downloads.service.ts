import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MediaType } from '@prisma/client';
import { Request, Response } from 'express';
import { createReadStream, promises as fs } from 'fs';
import { StreamableFile } from '@nestjs/common';
import { QUEUE_NAMES } from '../../common/constants';
import {
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

    const job = await this.downloadRepository.create({
      videoId: dto.videoId,
      formatId: dto.formatId,
      quality: dto.quality,
      mediaType: dto.mediaType ?? MediaType.VIDEO,
    });

    const payload: DownloadJobPayload = {
      downloadJobId: job.id,
      videoUrl: video.url,
      formatId: dto.formatId,
      mediaType: dto.mediaType ?? MediaType.VIDEO,
      title: video.title ?? undefined,
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
