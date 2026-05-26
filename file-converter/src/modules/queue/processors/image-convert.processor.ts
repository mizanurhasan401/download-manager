import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConversionEventType } from '@prisma/client';
import { QUEUE_NAMES } from '../../../common/constants';
import { FileConversionJobPayload } from '../../../common/interfaces';
import { FileConversionJobRepository } from '../../file-converter/repositories/file-conversion-job.repository';
import { ConversionProgressService } from '../../file-converter/services/conversion-progress.service';
import { ConversionRouterService } from '../../processing/conversion-router.service';
import { LocalStorageService } from '../../storage/local-storage.service';
import {
  buildOutputFileName,
  buildOutputPath,
  finalizeJob,
} from './processor-utils';

/**
 * Image-to-image conversions (PNG/JPG/WebP).
 *
 * Concurrency is moderate (default 4) because Sharp releases the JS event loop
 * around its native binding so multiple jobs can share CPU efficiently.
 */
@Processor(QUEUE_NAMES.IMAGE_CONVERT, {
  concurrency: parseInt(process.env.IMAGE_CONVERSION_CONCURRENCY ?? '4', 10),
})
export class ImageConvertProcessor extends WorkerHost {
  private readonly logger = new Logger(ImageConvertProcessor.name);

  constructor(
    private readonly repo: FileConversionJobRepository,
    private readonly storage: LocalStorageService,
    private readonly router: ConversionRouterService,
    private readonly progress: ConversionProgressService,
  ) {
    super();
  }

  async process(job: Job<FileConversionJobPayload>): Promise<void> {
    const {
      jobId,
      sourceFormat,
      targetFormat,
      originalFilePath,
      originalFileName,
      parameters,
    } = job.data;

    this.logger.log(
      `Image processor handling ${jobId} (${sourceFormat} → ${targetFormat})`,
    );

    try {
      await this.repo.markStarted(jobId);
      await this.repo.addHistory(
        jobId,
        ConversionEventType.STARTED,
        'Image conversion started',
      );
      await job.updateProgress(10);
      await this.repo.updateProgress(jobId, 10);
      this.progress.publish({
        jobId,
        status: 'PROCESSING',
        progress: 10,
        timestamp: Date.now(),
      });

      await this.repo.markConverting(jobId);
      await this.repo.addHistory(
        jobId,
        ConversionEventType.CONVERTING,
        'Sharp encoder running',
      );
      await job.updateProgress(40);
      await this.repo.updateProgress(jobId, 40);
      this.progress.publish({
        jobId,
        status: 'CONVERTING',
        progress: 40,
        phase: 'Encoding image',
        timestamp: Date.now(),
      });

      const outputFileName = buildOutputFileName(
        originalFileName,
        targetFormat,
      );
      const outputPath = buildOutputPath(this.storage, outputFileName);

      const output = await this.router.convert({
        inputPath: originalFilePath,
        outputPath,
        sourceFormat,
        targetFormat,
        parameters,
      });

      await job.updateProgress(90);
      await this.repo.updateProgress(jobId, 90);

      await finalizeJob({
        jobId,
        output: { ...output, fileName: outputFileName },
        repo: this.repo,
        progress: this.progress,
        logger: this.logger,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Image job ${jobId} failed: ${message}`);
      await this.repo.markFailed(jobId, message);
      await this.repo.addHistory(jobId, ConversionEventType.FAILED, message);
      this.progress.publish({
        jobId,
        status: 'FAILED',
        progress: 0,
        errorMessage: message,
        timestamp: Date.now(),
      });
      throw error;
    }
  }
}
