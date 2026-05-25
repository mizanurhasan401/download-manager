import { Injectable } from '@nestjs/common';
import {
  DownloadJob,
  DownloadStatus,
  DownloadEventType,
  MediaType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface CreateDownloadJobInput {
  videoId: string;
  formatId: string;
  quality?: string;
  mediaType?: MediaType;
}

@Injectable()
export class DownloadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<DownloadJob | null> {
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
