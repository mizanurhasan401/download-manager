import { Injectable } from '@nestjs/common';
import {
  ImageEventType,
  ImageFile,
  ImageFileKind,
  ImageFormat,
  ImageJob,
  ImageJobStatus,
  ImageOperation,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface CreateImageJobInput {
  operation: ImageOperation;
  parameters: Prisma.InputJsonValue;
}

export interface CreateImageFileInput {
  jobId: string;
  kind: ImageFileKind;
  filePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  format?: ImageFormat;
  hasAlpha?: boolean;
  checksum?: string;
}

export type ImageJobWithFiles = ImageJob & { files: ImageFile[] };

@Injectable()
export class ImageJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateImageJobInput): Promise<ImageJob> {
    return this.prisma.imageJob.create({
      data: {
        operation: input.operation,
        parameters: input.parameters,
        status: ImageJobStatus.PENDING,
      },
    });
  }

  async addFile(input: CreateImageFileInput): Promise<ImageFile> {
    return this.prisma.imageFile.create({
      data: {
        jobId: input.jobId,
        kind: input.kind,
        filePath: input.filePath,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: BigInt(input.sizeBytes),
        width: input.width,
        height: input.height,
        format: input.format,
        hasAlpha: input.hasAlpha ?? false,
        checksum: input.checksum,
      },
    });
  }

  async setQueueJobId(id: string, queueJobId: string): Promise<void> {
    await this.prisma.imageJob.update({
      where: { id },
      data: { queueJobId, status: ImageJobStatus.QUEUED },
    });
  }

  async markStarted(id: string): Promise<void> {
    await this.prisma.imageJob.update({
      where: { id },
      data: { status: ImageJobStatus.PROCESSING, startedAt: new Date() },
    });
  }

  async updateProgress(id: string, progress: number): Promise<void> {
    await this.prisma.imageJob.update({
      where: { id },
      data: { progress: Math.min(Math.max(progress, 0), 100) },
    });
  }

  async markCompleted(id: string): Promise<void> {
    await this.prisma.imageJob.update({
      where: { id },
      data: {
        status: ImageJobStatus.COMPLETED,
        progress: 100,
        completedAt: new Date(),
      },
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.prisma.imageJob.update({
      where: { id },
      data: {
        status: ImageJobStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      },
    });
  }

  async markCancelled(id: string): Promise<void> {
    await this.prisma.imageJob.update({
      where: { id },
      data: { status: ImageJobStatus.CANCELLED, completedAt: new Date() },
    });
  }

  async findById(id: string): Promise<ImageJobWithFiles | null> {
    return this.prisma.imageJob.findUnique({
      where: { id },
      include: { files: true },
    });
  }

  async list(limit = 25): Promise<ImageJobWithFiles[]> {
    return this.prisma.imageJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { files: true },
    });
  }

  async addHistory(
    jobId: string,
    event: ImageEventType,
    message?: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.imageHistory.create({
      data: {
        jobId,
        event,
        message,
        metadata,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.imageJob.delete({ where: { id } });
  }

  async findFileByJobAndKind(
    jobId: string,
    kind: ImageFileKind,
  ): Promise<ImageFile | null> {
    return this.prisma.imageFile.findFirst({
      where: { jobId, kind },
      orderBy: { createdAt: 'desc' },
    });
  }
}
