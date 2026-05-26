import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { promises as fs } from 'fs';
import { ImageEventType } from '@prisma/client';
import { QUEUE_NAMES } from '../../../common/constants';
import { ImageJobPayload } from '../../../common/interfaces';
import { ImageJobRepository } from '../../images/repositories/image-job.repository';
import { LocalStorageService } from '../../storage/local-storage.service';
import {
  SharpService,
  TargetFormat,
  ResizeFitOption,
} from '../../processing/sharp.service';
import {
  buildOutputFileName,
  buildOutputPath,
  finalizeJob,
  mimeForFormat,
} from './processor-utils';

@Processor(QUEUE_NAMES.IMAGE_FAST_OPS, {
  concurrency: parseInt(process.env.FAST_OPS_CONCURRENCY ?? '5', 10),
})
export class FastOpsProcessor extends WorkerHost {
  private readonly logger = new Logger(FastOpsProcessor.name);

  constructor(
    private readonly repo: ImageJobRepository,
    private readonly storage: LocalStorageService,
    private readonly sharp: SharpService,
    // ConfigService kept for future tuning hooks
    _configService: ConfigService,
  ) {
    super();
    void _configService;
  }

  async process(job: Job<ImageJobPayload>): Promise<void> {
    const { jobId, operation, originalFilePath, originalFileName, parameters } =
      job.data;
    this.logger.log(`Processing fast-op job ${jobId} (${operation})`);

    try {
      await this.repo.markStarted(jobId);
      await this.repo.addHistory(jobId, ImageEventType.STARTED, `Started ${operation}`);
      await job.updateProgress(10);
      await this.repo.updateProgress(jobId, 10);

      if (operation === 'CONVERT') {
        await this.runConvert(jobId, originalFilePath, originalFileName, parameters);
      } else if (operation === 'RESIZE') {
        await this.runResize(jobId, originalFilePath, originalFileName, parameters);
      } else {
        throw new Error(`Unsupported operation for fast-ops queue: ${operation}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Fast-op job ${jobId} failed: ${message}`);
      await this.repo.markFailed(jobId, message);
      await this.repo.addHistory(jobId, ImageEventType.FAILED, message);
      throw error;
    }
  }

  private async runConvert(
    jobId: string,
    inputPath: string,
    originalFileName: string,
    parameters: Record<string, unknown>,
  ): Promise<void> {
    const format = (parameters.format as TargetFormat) ?? 'png';
    const quality = parameters.quality as number | undefined;

    const fileName = buildOutputFileName(originalFileName, format, 'converted');
    const outputPath = buildOutputPath(this.storage, fileName);

    const info = await this.sharp.convert(inputPath, outputPath, { format, quality });
    const stat = await fs.stat(outputPath);

    await finalizeJob({
      jobId,
      output: {
        outputPath,
        fileName,
        mimeType: mimeForFormat(format),
        width: info.width,
        height: info.height,
        format,
        hasAlpha: format !== 'jpeg',
        sizeBytes: stat.size,
      },
      repo: this.repo,
      sharp: this.sharp,
      logger: this.logger,
    });
  }

  private async runResize(
    jobId: string,
    inputPath: string,
    originalFileName: string,
    parameters: Record<string, unknown>,
  ): Promise<void> {
    const format = parameters.format as TargetFormat | undefined;
    const width = parameters.width as number | undefined;
    const height = parameters.height as number | undefined;
    const fit = (parameters.fit as ResizeFitOption | undefined) ?? 'cover';
    const quality = parameters.quality as number | undefined;

    const sourceMeta = await this.sharp.extractMetadata(inputPath);
    const outFormat: TargetFormat =
      format ??
      (sourceMeta.format === 'jpeg' || sourceMeta.format === 'jpg'
        ? 'jpeg'
        : sourceMeta.format === 'webp'
          ? 'webp'
          : sourceMeta.format === 'avif'
            ? 'avif'
            : 'png');

    const fileName = buildOutputFileName(originalFileName, outFormat, `resized_${width ?? 'auto'}x${height ?? 'auto'}`);
    const outputPath = buildOutputPath(this.storage, fileName);

    const info = await this.sharp.resize(inputPath, outputPath, {
      width,
      height,
      fit,
      format: outFormat,
      quality,
    });
    const stat = await fs.stat(outputPath);

    await finalizeJob({
      jobId,
      output: {
        outputPath,
        fileName,
        mimeType: mimeForFormat(outFormat),
        width: info.width,
        height: info.height,
        format: outFormat,
        hasAlpha: outFormat !== 'jpeg',
        sizeBytes: stat.size,
      },
      repo: this.repo,
      sharp: this.sharp,
      logger: this.logger,
    });
  }
}
