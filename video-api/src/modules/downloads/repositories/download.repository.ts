import { Injectable } from '@nestjs/common';
import {
  DownloadJob,
  DownloadStatus,
  DownloadEventType,
  JobKind,
  MediaType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface CreateDownloadJobInput {
  videoId: string;
  formatId: string;
  quality?: string;
  mediaType?: MediaType;
  audioBitrate?: number;
  clipStartSeconds?: number;
  clipEndSeconds?: number;
  jobKind?: JobKind;
  playlistId?: string;
}

export type DownloadJobWithVideo = Prisma.DownloadJobGetPayload<{
  include: { video: true };
}>;

@Injectable()
export class DownloadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<DownloadJobWithVideo | null> {
    return this.prisma.downloadJob.findUnique({
      where: { id },
      include: { video: true },
    });
  }

  async create(input: CreateDownloadJobInput): Promise<DownloadJob> {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.downloadJob.create({
        data: {
          videoId: input.videoId,
          formatId: input.formatId,
          quality: input.quality,
          mediaType: input.mediaType ?? MediaType.VIDEO,
          status: DownloadStatus.PENDING,
          audioBitrate: input.audioBitrate,
          clipStartSeconds: input.clipStartSeconds,
          clipEndSeconds: input.clipEndSeconds,
          jobKind: input.jobKind ?? JobKind.SINGLE,
          playlistId: input.playlistId,
        },
      });

      await tx.downloadHistory.create({
        data: {
          downloadJobId: job.id,
          event: DownloadEventType.CREATED,
          message: 'Download job created',
        },
      });

      return job;
    });
  }

  async updateStatus(
    id: string,
    status: DownloadStatus,
    data?: Partial<DownloadJob>,
  ): Promise<DownloadJob> {
    return this.prisma.downloadJob.update({
      where: { id },
      data: {
        status,
        ...data,
      },
    });
  }

  async updateProgress(
    id: string,
    progress: number,
    message?: string,
  ): Promise<DownloadJob> {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.downloadJob.update({
        where: { id },
        data: { progress },
      });

      await tx.downloadHistory.create({
        data: {
          downloadJobId: id,
          event: DownloadEventType.PROGRESS,
          message: message ?? `Progress: ${progress}%`,
          metadata: { progress },
        },
      });

      return job;
    });
  }

  async markQueued(id: string, queueJobId: string): Promise<DownloadJob> {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.downloadJob.update({
        where: { id },
        data: {
          status: DownloadStatus.QUEUED,
          queueJobId,
        },
      });

      await tx.downloadHistory.create({
        data: {
          downloadJobId: id,
          event: DownloadEventType.QUEUED,
          message: 'Job added to queue',
          metadata: { queueJobId },
        },
      });

      return job;
    });
  }

  async markCompleted(
    id: string,
    data: {
      filePath: string;
      fileName: string;
      fileSize: bigint;
      mimeType: string;
    },
  ): Promise<DownloadJob> {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.downloadJob.update({
        where: { id },
        data: {
          status: DownloadStatus.COMPLETED,
          progress: 100,
          filePath: data.filePath,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          completedAt: new Date(),
        },
      });

      await tx.downloadHistory.create({
        data: {
          downloadJobId: id,
          event: DownloadEventType.COMPLETED,
          message: 'Download completed successfully',
          metadata: {
            filePath: data.filePath,
            fileSize: data.fileSize.toString(),
          } as Prisma.InputJsonValue,
        },
      });

      return job;
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<DownloadJob> {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.downloadJob.update({
        where: { id },
        data: {
          status: DownloadStatus.FAILED,
          errorMessage,
          completedAt: new Date(),
        },
      });

      await tx.downloadHistory.create({
        data: {
          downloadJobId: id,
          event: DownloadEventType.FAILED,
          message: errorMessage,
        },
      });

      return job;
    });
  }

  async resetForRetry(id: string): Promise<DownloadJob> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.downloadJob.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Download job not found');
      }

      const job = await tx.downloadJob.update({
        where: { id },
        data: {
          status: DownloadStatus.PENDING,
          progress: 0,
          errorMessage: null,
          completedAt: null,
          startedAt: null,
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });

      await tx.downloadHistory.create({
        data: {
          downloadJobId: id,
          event: DownloadEventType.RETRYING,
          message: `Retry attempt #${job.attemptCount}`,
        },
      });

      return job;
    });
  }

  async markCancelled(id: string): Promise<DownloadJob> {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.downloadJob.update({
        where: { id },
        data: {
          status: DownloadStatus.CANCELLED,
          completedAt: new Date(),
        },
      });

      await tx.downloadHistory.create({
        data: {
          downloadJobId: id,
          event: DownloadEventType.CANCELLED,
          message: 'Download cancelled',
        },
      });

      return job;
    });
  }

  async findByPlaylistId(playlistId: string): Promise<DownloadJob[]> {
    return this.prisma.downloadJob.findMany({
      where: { playlistId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async countByPlaylistAndStatus(
    playlistId: string,
  ): Promise<Record<DownloadStatus, number>> {
    const groups = await this.prisma.downloadJob.groupBy({
      by: ['status'],
      where: { playlistId },
      _count: { _all: true },
    });

    const result: Record<DownloadStatus, number> = {
      PENDING: 0,
      QUEUED: 0,
      PROCESSING: 0,
      MERGING: 0,
      COMPLETED: 0,
      FAILED: 0,
      CANCELLED: 0,
    };
    for (const group of groups) {
      result[group.status] = group._count._all;
    }
    return result;
  }

  async addHistoryEvent(
    downloadJobId: string,
    event: DownloadEventType,
    message?: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.downloadHistory.create({
      data: {
        downloadJobId,
        event,
        message,
        metadata,
      },
    });
  }
}
