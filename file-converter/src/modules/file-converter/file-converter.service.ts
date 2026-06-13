import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { fromBuffer as fileTypeFromBuffer } from 'file-type';
import {
  ConversionCategory,
  ConversionEventType,
  ConversionFileFormat,
  ConversionFileKind,
  ConversionJobStatus,
  FileConversionFile,
  Prisma,
} from '@prisma/client';
import { QUEUE_NAMES } from '../../common/constants';
import {
  FileConversionException,
  FileConversionJobNotFoundException,
  FileConversionJobNotReadyException,
  FileTooLargeException,
  UnsupportedFileFormatException,
} from '../../common/exceptions/business.exception';
import { FileConversionJobPayload } from '../../common/interfaces';
import {
  extensionToFormat,
  hashBuffer,
  mimeToFormat,
  sanitizeFileName,
} from '../../common/utils';
import { ConversionRouterService } from '../processing/conversion-router.service';
import { LocalStorageService } from '../storage/local-storage.service';
import { ConvertFileDto, TargetFormatDto } from './dto/convert-file.dto';
import {
  FileConversionJobRepository,
  FileConversionJobWithFiles,
} from './repositories/file-conversion-job.repository';
import { ConversionProgressService } from './services/conversion-progress.service';

const TARGET_FORMAT_MAP: Record<TargetFormatDto, ConversionFileFormat> = {
  [TargetFormatDto.PDF]: ConversionFileFormat.PDF,
  [TargetFormatDto.DOCX]: ConversionFileFormat.DOCX,
  [TargetFormatDto.PNG]: ConversionFileFormat.PNG,
  [TargetFormatDto.JPG]: ConversionFileFormat.JPG,
  [TargetFormatDto.WEBP]: ConversionFileFormat.WEBP,
  [TargetFormatDto.HEIC]: ConversionFileFormat.HEIC,
  [TargetFormatDto.GIF]: ConversionFileFormat.GIF,
  [TargetFormatDto.TIFF]: ConversionFileFormat.TIFF,
};

@Injectable()
export class FileConverterService {
  private readonly logger = new Logger(FileConverterService.name);
  private readonly maxUploadBytes: number;

  constructor(
    private readonly repo: FileConversionJobRepository,
    private readonly storage: LocalStorageService,
    private readonly router: ConversionRouterService,
    private readonly progress: ConversionProgressService,
    @InjectQueue(QUEUE_NAMES.IMAGE_CONVERT)
    private readonly imageQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DOCUMENT_CONVERT)
    private readonly documentQueue: Queue,
    configService: ConfigService,
  ) {
    const mb = configService.get<number>('processing.maxUploadSizeMb', 50);
    this.maxUploadBytes = mb * 1024 * 1024;
  }

  async createJob(
    file: Express.Multer.File,
    dto: ConvertFileDto,
  ): Promise<FileConversionJobWithFiles> {
    this.validateInputFile(file);
    const sourceFormat = await this.detectSourceFormat(file);
    const targetFormat = TARGET_FORMAT_MAP[dto.targetFormat];

    // Throws UnsupportedConversionException for invalid pairs before anything
    // touches the database or queue.
    this.router.assertSupported(sourceFormat, targetFormat);

    const category = this.router.resolveCategory(sourceFormat, targetFormat);
    const parameters: Record<string, unknown> = {};
    if (dto.quality !== undefined) parameters.quality = dto.quality;

    const job = await this.repo.create({
      category,
      sourceFormat,
      targetFormat,
      parameters: parameters as Prisma.InputJsonValue,
    });

    const safeName = sanitizeFileName(file.originalname || 'file');
    const storedName = `${job.id}_${Date.now()}_${safeName}`;
    const stored = await this.storage.writeBuffer(
      'UPLOADS',
      storedName,
      file.buffer,
      file.mimetype || 'application/octet-stream',
    );

    await this.repo.addFile({
      jobId: job.id,
      kind: ConversionFileKind.ORIGINAL,
      filePath: stored.path,
      fileName: stored.fileName,
      mimeType: stored.mimeType,
      sizeBytes: stored.size,
      format: sourceFormat,
      checksum: hashBuffer(file.buffer),
    });

    await this.repo.addHistory(
      job.id,
      ConversionEventType.CREATED,
      `Conversion ${sourceFormat} → ${targetFormat} created`,
    );

    const queue =
      category === ConversionCategory.IMAGE
        ? this.imageQueue
        : this.documentQueue;

    const payload: FileConversionJobPayload = {
      jobId: job.id,
      category,
      sourceFormat,
      targetFormat,
      originalFilePath: stored.path,
      originalFileName: stored.fileName,
      parameters,
    };

    const queueJobId = randomUUID();
    await queue.add(`${sourceFormat}_to_${targetFormat}`, payload, {
      jobId: queueJobId,
    });

    await this.repo.setQueueJobId(job.id, queueJobId);
    await this.repo.addHistory(
      job.id,
      ConversionEventType.QUEUED,
      'Conversion job queued',
    );

    // Push initial "QUEUED" SSE event so connecting clients see immediate state.
    this.progress.publish({
      jobId: job.id,
      status: 'QUEUED',
      progress: 0,
      timestamp: Date.now(),
    });

    const refreshed = await this.repo.findById(job.id);
    if (!refreshed) {
      throw new FileConversionException('Failed to create conversion job');
    }
    return refreshed;
  }

  async getJob(id: string): Promise<FileConversionJobWithFiles> {
    const job = await this.repo.findById(id);
    if (!job) throw new FileConversionJobNotFoundException();
    return job;
  }

  listJobs(limit = 25): Promise<FileConversionJobWithFiles[]> {
    return this.repo.list(limit);
  }

  async deleteJob(id: string): Promise<void> {
    const job = await this.repo.findById(id);
    if (!job) throw new FileConversionJobNotFoundException();
    for (const file of job.files) {
      await this.storage.deleteFile(file.filePath);
    }
    await this.repo.delete(id);
  }

  async getJobFile(
    id: string,
    kind: ConversionFileKind,
  ): Promise<{ file: FileConversionFile; job: FileConversionJobWithFiles }> {
    const job = await this.getJob(id);
    if (
      kind === ConversionFileKind.OUTPUT &&
      job.status !== ConversionJobStatus.COMPLETED
    ) {
      throw new FileConversionJobNotReadyException('Output file not ready yet');
    }
    const file = await this.repo.findFileByJobAndKind(id, kind);
    if (!file) {
      throw new FileConversionJobNotFoundException(
        kind === ConversionFileKind.OUTPUT
          ? 'Output file not found'
          : 'Original file not found',
      );
    }
    return { file, job };
  }

  /**
   * Initial snapshot used by SSE when a client connects: turns the latest DB
   * state into the same event shape pushed by the processor. Without this,
   * clients connecting to a job that finished moments before would never see a
   * terminal event.
   */
  async getProgressSnapshot(
    id: string,
  ): Promise<ReturnType<typeof toEventFromJob>> {
    const job = await this.getJob(id);
    return toEventFromJob(job);
  }

  getStorage(): LocalStorageService {
    return this.storage;
  }

  private validateInputFile(file: Express.Multer.File): void {
    if (!file) throw new FileConversionException('No file uploaded');
    if (file.size > this.maxUploadBytes) {
      throw new FileTooLargeException(
        `File exceeds maximum upload size of ${(
          this.maxUploadBytes / (1024 * 1024)
        ).toFixed(0)} MB`,
      );
    }
  }

  /**
   * Detect the source format via magic-bytes (file-type) with a filename-based
   * fallback for formats with no reliable signature (e.g. text/plain).
   */
  private async detectSourceFormat(
    file: Express.Multer.File,
  ): Promise<ConversionFileFormat> {
    const detected = await fileTypeFromBuffer(file.buffer);
    if (detected) {
      const fromMime = mimeToFormat(detected.mime);
      if (fromMime) return fromMime;
    }

    // file-type cannot detect TXT/CSV (no magic bytes). Fall back to MIME from
    // the multipart upload, then to the extension.
    const fromUploadMime = file.mimetype ? mimeToFormat(file.mimetype) : null;
    if (fromUploadMime) return fromUploadMime;

    const fromExt = extensionToFormat(file.originalname);
    if (fromExt) return fromExt;

    throw new UnsupportedFileFormatException(
      `Could not detect source format for "${file.originalname}"`,
    );
  }
}

function toEventFromJob(
  job: FileConversionJobWithFiles,
): import('./services/conversion-progress.service').ConversionProgressEvent {
  return {
    jobId: job.id,
    status: ConversionProgressService.toSseStatus(job.status),
    progress: job.progress,
    errorMessage: job.errorMessage ?? undefined,
    timestamp: Date.now(),
  };
}
