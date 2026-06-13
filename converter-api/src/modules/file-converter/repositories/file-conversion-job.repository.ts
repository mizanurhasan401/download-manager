import { Injectable } from '@nestjs/common';
import {
  ConversionCategory,
  ConversionEventType,
  ConversionFileFormat,
  ConversionFileKind,
  ConversionJobStatus,
  FileConversionFile,
  FileConversionJob,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type FileConversionJobWithFiles = FileConversionJob & {
  files: FileConversionFile[];
};

export interface CreateFileConversionJobInput {
  category: ConversionCategory;
  sourceFormat: ConversionFileFormat;
  targetFormat: ConversionFileFormat;
  parameters: Prisma.InputJsonValue;
}

export interface CreateFileConversionFileInput {
  jobId: string;
  kind: ConversionFileKind;
  filePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  format?: ConversionFileFormat;
  checksum?: string;
}

/**
 * Sole Prisma boundary for the file-converter feature. Both `FileConverterService`
 * and the BullMQ processors inject this repository — keeping every database
 * mutation traceable to one file.
 */
@Injectable()
export class FileConversionJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateFileConversionJobInput): Promise<FileConversionJob> {
    return this.prisma.fileConversionJob.create({
      data: {
        category: input.category,
        sourceFormat: input.sourceFormat,
        targetFormat: input.targetFormat,
        parameters: input.parameters,
        status: ConversionJobStatus.PENDING,
      },
    });
  }

  addFile(input: CreateFileConversionFileInput): Promise<FileConversionFile> {
    return this.prisma.fileConversionFile.create({
      data: {
        jobId: input.jobId,
        kind: input.kind,
        filePath: input.filePath,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: BigInt(input.sizeBytes),
        format: input.format,
        checksum: input.checksum,
      },
    });
  }

  async setQueueJobId(id: string, queueJobId: string): Promise<void> {
    await this.prisma.fileConversionJob.update({
      where: { id },
      data: { queueJobId, status: ConversionJobStatus.QUEUED },
    });
  }

  async markStarted(id: string): Promise<void> {
    await this.prisma.fileConversionJob.update({
      where: { id },
      data: {
        status: ConversionJobStatus.PROCESSING,
        startedAt: new Date(),
      },
    });
  }

  async markConverting(id: string): Promise<void> {
    await this.prisma.fileConversionJob.update({
      where: { id },
      data: { status: ConversionJobStatus.CONVERTING },
    });
  }

  async updateProgress(id: string, progress: number): Promise<void> {
    await this.prisma.fileConversionJob.update({
      where: { id },
      data: { progress: Math.min(Math.max(progress, 0), 100) },
    });
  }

  async markCompleted(id: string): Promise<void> {
    await this.prisma.fileConversionJob.update({
      where: { id },
      data: {
        status: ConversionJobStatus.COMPLETED,
        progress: 100,
        completedAt: new Date(),
      },
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.prisma.fileConversionJob.update({
      where: { id },
      data: {
        status: ConversionJobStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      },
    });
  }

  async markCancelled(id: string): Promise<void> {
    await this.prisma.fileConversionJob.update({
      where: { id },
      data: {
        status: ConversionJobStatus.CANCELLED,
        completedAt: new Date(),
      },
    });
  }

  findById(id: string): Promise<FileConversionJobWithFiles | null> {
    return this.prisma.fileConversionJob.findUnique({
      where: { id },
      include: { files: true },
    });
  }

  list(limit = 25): Promise<FileConversionJobWithFiles[]> {
    return this.prisma.fileConversionJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { files: true },
    });
  }

  async addHistory(
    jobId: string,
    event: ConversionEventType,
    message?: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.fileConversionHistory.create({
      data: {
        jobId,
        event,
        message,
        metadata,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.fileConversionJob.delete({ where: { id } });
  }

  findFileByJobAndKind(
    jobId: string,
    kind: ConversionFileKind,
  ): Promise<FileConversionFile | null> {
    return this.prisma.fileConversionFile.findFirst({
      where: { jobId, kind },
      orderBy: { createdAt: 'desc' },
    });
  }
}
