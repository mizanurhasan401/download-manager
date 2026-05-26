import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { promises as fs } from 'fs';
import { ImageEventType } from '@prisma/client';
import { QUEUE_NAMES } from '../../../common/constants';
import { ImageJobPayload } from '../../../common/interfaces';
import { ImageJobRepository } from '../../images/repositories/image-job.repository';
import { LocalStorageService } from '../../storage/local-storage.service';
import { SharpService } from '../../processing/sharp.service';
import { BackgroundRemovalService } from '../../processing/background-removal.service';
import {
  buildOutputFileName,
  buildOutputPath,
  finalizeJob,
  mimeForFormat,
} from './processor-utils';

@Processor(QUEUE_NAMES.IMAGE_BG_REMOVE, {
  concurrency: parseInt(process.env.BG_REMOVE_CONCURRENCY ?? '1', 10),
})
export class BackgroundRemoveProcessor extends WorkerHost {
  private readonly logger = new Logger(BackgroundRemoveProcessor.name);

  constructor(
    private readonly repo: ImageJobRepository,
    private readonly storage: LocalStorageService,
    private readonly sharp: SharpService,
    private readonly bgRemoval: BackgroundRemovalService,
  ) {
    super();
  }

  async process(job: Job<ImageJobPayload>): Promise<void> {
    const { jobId, originalFilePath, originalFileName } = job.data;
    this.logger.log(`Processing bg-remove job ${jobId}`);

    try {
      await this.repo.markStarted(jobId);
      await this.repo.addHistory(jobId, ImageEventType.STARTED, 'Started background removal');
      await job.updateProgress(15);
      await this.repo.updateProgress(jobId, 15);

      const cutoutBuffer = await this.bgRemoval.removeBackground(originalFilePath);
      await job.updateProgress(75);
      await this.repo.updateProgress(jobId, 75);

      const fileName = buildOutputFileName(originalFileName, 'png', 'cutout');
      const outputPath = buildOutputPath(this.storage, fileName);
      const info = await this.sharp.finalizeBuffer(cutoutBuffer, outputPath, 'png');
      const stat = await fs.stat(outputPath);

      await finalizeJob({
        jobId,
        output: {
          outputPath,
          fileName,
          mimeType: mimeForFormat('png'),
          width: info.width,
          height: info.height,
          format: 'png',
          hasAlpha: true,
          sizeBytes: stat.size,
        },
        repo: this.repo,
        sharp: this.sharp,
        logger: this.logger,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`bg-remove job ${jobId} failed: ${message}`);
      await this.repo.markFailed(jobId, message);
      await this.repo.addHistory(jobId, ImageEventType.FAILED, message);
      throw error;
    }
  }
}
