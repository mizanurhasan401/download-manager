import { Logger } from '@nestjs/common';
import {
  ConversionEventType,
  ConversionFileFormat,
  ConversionFileKind,
} from '@prisma/client';
import * as path from 'path';
import { ConvertedFileInfo } from '../../../common/interfaces';
import {
  getExtensionForFormat,
  stripExtension,
} from '../../../common/utils';
import { FileConversionJobRepository } from '../../file-converter/repositories/file-conversion-job.repository';
import { LocalStorageService } from '../../storage/local-storage.service';

export function buildOutputFileName(
  originalFileName: string,
  targetFormat: ConversionFileFormat,
): string {
  const base = stripExtension(originalFileName);
  const ext = getExtensionForFormat(targetFormat);
  return `${base}_converted.${ext}`;
}

export function buildOutputPath(
  storage: LocalStorageService,
  fileName: string,
): string {
  return storage.buildFilePath('CONVERTED', fileName);
}

/**
 * Finalize a successful conversion: persist the OUTPUT file row, mark the job
 * completed, and append a COMPLETED history entry.
 *
 * The terminal SSE event is emitted by ConversionProgressService from the
 * BullMQ `completed` event (Redis), so processors never publish it directly.
 *
 * Pulled into a shared helper so future processors (chunked PDF tasks, etc.)
 * cannot accidentally diverge from the canonical completion sequence.
 */
export async function finalizeJob(options: {
  jobId: string;
  output: ConvertedFileInfo;
  repo: FileConversionJobRepository;
  logger: Logger;
}): Promise<void> {
  const { jobId, output, repo, logger } = options;

  await repo.addFile({
    jobId,
    kind: ConversionFileKind.OUTPUT,
    filePath: output.outputPath,
    fileName: output.fileName,
    mimeType: output.mimeType,
    sizeBytes: output.sizeBytes,
    format: output.format,
  });
  await repo.updateProgress(jobId, 100);
  await repo.markCompleted(jobId);
  await repo.addHistory(
    jobId,
    ConversionEventType.COMPLETED,
    'Conversion completed',
    {
      outputBytes: output.sizeBytes,
      outputFormat: output.format,
    },
  );

  logger.log(`Job ${jobId} completed → ${path.basename(output.outputPath)}`);
}
