import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConversionEventType, ConversionFileFormat } from '@prisma/client';
import { QUEUE_NAMES } from '../../../common/constants';
import { FileConversionJobPayload } from '../../../common/interfaces';
import { FileConversionJobRepository } from '../../file-converter/repositories/file-conversion-job.repository';
import { ConversionRouterService } from '../../processing/conversion-router.service';
import { PdfService } from '../../processing/pdf.service';
import { LocalStorageService } from '../../storage/local-storage.service';
import {
  buildOutputFileName,
  buildOutputPath,
  finalizeJob,
} from './processor-utils';

/**
 * Document conversions (PDF, DOCX, PPTX, XLSX, TXT) via LibreOffice headless.
 *
 * Concurrency defaults to 1: a single LibreOffice process can technically
 * accept multiple jobs but its profile lock and memory footprint make serial
 * processing dramatically more reliable. Operators can raise the env knob if
 * the host has the resources for it.
 */
@Processor(QUEUE_NAMES.DOCUMENT_CONVERT, {
  concurrency: parseInt(process.env.DOCUMENT_CONVERSION_CONCURRENCY ?? '1', 10),
})
export class DocumentConvertProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentConvertProcessor.name);

  constructor(
    private readonly repo: FileConversionJobRepository,
    private readonly storage: LocalStorageService,
    private readonly router: ConversionRouterService,
    private readonly pdf: PdfService,
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
      `Document processor handling ${jobId} (${sourceFormat} → ${targetFormat})`,
    );

    try {
      await this.repo.markStarted(jobId);
      await this.repo.addHistory(
        jobId,
        ConversionEventType.STARTED,
        'Document conversion started',
      );
      await this.repo.updateProgress(jobId, 10);
      await job.updateProgress({ jobId, status: 'PROCESSING', progress: 10 });

      await this.repo.markConverting(jobId);
      await this.repo.addHistory(
        jobId,
        ConversionEventType.CONVERTING,
        'LibreOffice running',
      );
      await this.repo.updateProgress(jobId, 35);
      await job.updateProgress({
        jobId,
        status: 'CONVERTING',
        progress: 35,
        phase: 'LibreOffice rendering document',
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

      // Best-effort metadata enrichment (page count) for PDF outputs.
      if (targetFormat === ConversionFileFormat.PDF) {
        const meta = await this.pdf.readMetadata(output.outputPath);
        if (meta) {
          await this.repo.addHistory(
            jobId,
            ConversionEventType.PROGRESS,
            `PDF rendered with ${meta.pageCount} page(s)`,
            { pageCount: meta.pageCount },
          );
        }
      }

      await this.repo.updateProgress(jobId, 90);
      await job.updateProgress({ jobId, status: 'CONVERTING', progress: 90 });

      await finalizeJob({
        jobId,
        output: { ...output, fileName: outputFileName },
        repo: this.repo,
        logger: this.logger,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Document job ${jobId} failed: ${message}`);
      await this.repo.markFailed(jobId, message);
      await this.repo.addHistory(jobId, ConversionEventType.FAILED, message);
      throw error;
    }
  }
}
