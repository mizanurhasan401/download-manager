import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { fromBuffer as fileTypeFromBuffer } from 'file-type';
import { randomUUID } from 'crypto';
import {
  ImageEventType,
  ImageFile,
  ImageFileKind,
  ImageJobStatus,
  ImageOperation,
  Prisma,
} from '@prisma/client';
import { QUEUE_NAMES } from '../../common/constants';
import {
  ImageJobNotFoundException,
  ImageJobNotReadyException,
  ImageProcessingException,
  ImageTooLargeException,
  UnsupportedImageFormatException,
} from '../../common/exceptions/business.exception';
import {
  hashBuffer,
  inferUploadMime,
  isFallbackExtension,
  isSupportedInputMime,
  sanitizeFileName,
} from '../../common/utils';
import { LocalStorageService } from '../storage/local-storage.service';
import { SharpService } from '../processing/sharp.service';
import {
  CreateImageJobDto,
  ImageOperationDto,
  OutputFormatDto,
} from './dto/create-image-job.dto';
import {
  ImageJobRepository,
  ImageJobWithFiles,
} from './repositories/image-job.repository';
import { ConfigService } from '@nestjs/config';

const OPERATION_MAP: Record<ImageOperationDto, ImageOperation> = {
  [ImageOperationDto.CONVERT]: ImageOperation.CONVERT,
  [ImageOperationDto.RESIZE]: ImageOperation.RESIZE,
  [ImageOperationDto.REMOVE_BACKGROUND]: ImageOperation.REMOVE_BACKGROUND,
};

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);
  private readonly maxUploadBytes: number;

  constructor(
    private readonly repo: ImageJobRepository,
    private readonly storage: LocalStorageService,
    private readonly sharp: SharpService,
    @InjectQueue(QUEUE_NAMES.IMAGE_FAST_OPS) private readonly fastOpsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.IMAGE_BG_REMOVE) private readonly bgRemoveQueue: Queue,
    configService: ConfigService,
  ) {
    const mb = configService.get<number>('processing.maxUploadSizeMb', 25);
    this.maxUploadBytes = mb * 1024 * 1024;
  }

  async createJob(
    file: Express.Multer.File,
    dto: CreateImageJobDto,
  ): Promise<ImageJobWithFiles> {
    this.validateInputFile(file);
    await this.validateMagicBytes(file);

    const operation = OPERATION_MAP[dto.operation];
    const parameters = this.normalizeParameters(dto);
    const parametersJson = parameters as Prisma.InputJsonValue;

    const job = await this.repo.create({ operation, parameters: parametersJson });

    const safeName = sanitizeFileName(file.originalname || 'image');
    const fileName = `${job.id}_${Date.now()}_${safeName}`;
    const uploadMime = inferUploadMime(safeName, file.mimetype);
    const stored = await this.storage.writeBuffer(
      'ORIGINALS',
      fileName,
      file.buffer,
      uploadMime,
    );

    const meta = await this.sharp.extractMetadata(stored.path);

    await this.repo.addFile({
      jobId: job.id,
      kind: ImageFileKind.ORIGINAL,
      filePath: stored.path,
      fileName: stored.fileName,
      mimeType: stored.mimeType,
      sizeBytes: stored.size,
      width: meta.width,
      height: meta.height,
      hasAlpha: meta.hasAlpha,
      checksum: hashBuffer(file.buffer),
    });

    await this.repo.addHistory(
      job.id,
      ImageEventType.CREATED,
      `Job created for ${operation}`,
    );

    const queue = operation === ImageOperation.REMOVE_BACKGROUND
      ? this.bgRemoveQueue
      : this.fastOpsQueue;

    const queueJobId = randomUUID();
    await queue.add(
      operation.toLowerCase(),
      {
        jobId: job.id,
        operation,
        originalFilePath: stored.path,
        originalFileName: stored.fileName,
        parameters,
      },
      { jobId: queueJobId },
    );

    await this.repo.setQueueJobId(job.id, queueJobId);
    await this.repo.addHistory(job.id, ImageEventType.QUEUED, 'Job queued');

    const refreshed = await this.repo.findById(job.id);
    if (!refreshed) {
      throw new ImageProcessingException('Failed to create job');
    }
    return refreshed;
  }

  async getJob(id: string): Promise<ImageJobWithFiles> {
    const job = await this.repo.findById(id);
    if (!job) {
      throw new ImageJobNotFoundException();
    }
    return job;
  }

  async listJobs(limit = 25): Promise<ImageJobWithFiles[]> {
    return this.repo.list(limit);
  }

  async deleteJob(id: string): Promise<void> {
    const job = await this.repo.findById(id);
    if (!job) {
      throw new ImageJobNotFoundException();
    }
    for (const file of job.files) {
      await this.storage.deleteFile(file.filePath);
    }
    await this.repo.delete(id);
  }

  async getJobFile(
    id: string,
    kind: ImageFileKind,
  ): Promise<{ file: ImageFile; job: ImageJobWithFiles }> {
    const job = await this.getJob(id);
    if (kind === ImageFileKind.OUTPUT && job.status !== ImageJobStatus.COMPLETED) {
      throw new ImageJobNotReadyException('Output file not ready yet');
    }
    const file = await this.repo.findFileByJobAndKind(id, kind);
    if (!file) {
      throw new ImageJobNotFoundException(
        kind === ImageFileKind.OUTPUT
          ? 'Output file not found'
          : 'Original file not found',
      );
    }
    return { file, job };
  }

  getStorage(): LocalStorageService {
    return this.storage;
  }

  private validateInputFile(file: Express.Multer.File): void {
    if (!file) {
      throw new ImageProcessingException('No file uploaded');
    }
    if (file.size > this.maxUploadBytes) {
      throw new ImageTooLargeException(
        `File exceeds maximum upload size of ${(this.maxUploadBytes / (1024 * 1024)).toFixed(0)} MB`,
      );
    }
    if (!isSupportedInputMime(file.mimetype) && !isFallbackExtension(file.originalname || '')) {
      throw new UnsupportedImageFormatException(
        `Unsupported MIME type: ${file.mimetype}. Allowed: PNG, JPEG, WebP, AVIF, HEIC, GIF, TIFF, BMP`,
      );
    }
  }

  private async validateMagicBytes(file: Express.Multer.File): Promise<void> {
    const fallbackByName = isFallbackExtension(file.originalname || '');
    const detected = await fileTypeFromBuffer(file.buffer);

    if (!detected) {
      if (fallbackByName) {
        return;
      }
      throw new UnsupportedImageFormatException('Unable to detect file type');
    }

    if (isSupportedInputMime(detected.mime)) {
      return;
    }

    if (fallbackByName) {
      return;
    }

    throw new UnsupportedImageFormatException(
      `Detected unsupported file type: ${detected.mime}`,
    );
  }

  private normalizeParameters(dto: CreateImageJobDto): Record<string, unknown> {
    switch (dto.operation) {
      case ImageOperationDto.CONVERT:
        if (!dto.format) {
          throw new ImageProcessingException('Convert requires target format');
        }
        return {
          format: dto.format,
          quality: dto.quality ?? this.defaultQualityForFormat(dto.format),
        };
      case ImageOperationDto.RESIZE:
        if (!dto.width && !dto.height) {
          throw new ImageProcessingException(
            'Resize requires at least width or height',
          );
        }
        return {
          width: dto.width,
          height: dto.height,
          fit: dto.fit ?? 'cover',
          format: dto.format,
          quality: dto.quality,
        };
      case ImageOperationDto.REMOVE_BACKGROUND:
        return { format: 'png' };
      default:
        return {};
    }
  }

  private defaultQualityForFormat(format: OutputFormatDto): number {
    switch (format) {
      case OutputFormatDto.JPEG:
      case OutputFormatDto.WEBP:
      case OutputFormatDto.HEIC:
        return 82;
      case OutputFormatDto.AVIF:
        return 60;
      case OutputFormatDto.PNG:
      case OutputFormatDto.GIF:
      case OutputFormatDto.TIFF:
      default:
        return 90;
    }
  }
}
