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
import { ConversionProgressService } from '../../file-converter/services/conversion-progress.service';
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
 * Finalize a successful conversion: persist the OUTPUT file row, push the
 * terminal SSE event, and append a COMPLETED history entry.
 *
 * Pulled into a shared helper so future processors (chunked PDF tasks, etc.)
 * cannot accidentally diverge from the canonical completion sequence.
 */
export async function finalizeJob(options: {
  jobId: string;
  output: ConvertedFileInfo;
  repo: FileConversionJobRepository;
  progress: ConversionProgressService;
  logger: Logger;
}): Promise<void> {
  const { jobId, output, repo, progress, logger } = options;

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

  progress.publish({
    jobId,
    status: 'COMPLETED',
    progress: 100,
    timestamp: Date.now(),
  });

  logger.log(`Job ${jobId} completed → ${path.basename(output.outputPath)}`);
}
