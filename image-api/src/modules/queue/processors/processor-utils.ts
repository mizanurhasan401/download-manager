import * as path from 'path';
import { ImageEventType, ImageFileKind, ImageFormat } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { LocalStorageService } from '../../storage/local-storage.service';
import { ImageJobRepository } from '../../images/repositories/image-job.repository';
import {
  inferExtensionFromFormat,
  inferMimeFromFormat,
  stripExtension,
} from '../../../common/utils';
import { SharpService } from '../../processing/sharp.service';

export interface ProcessedOutput {
  outputPath: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  format: string;
  hasAlpha: boolean;
  sizeBytes: number;
}

export function buildOutputFileName(
  originalFileName: string,
  targetFormat: string,
  suffix: string,
): string {
  const base = stripExtension(originalFileName);
  const ext = inferExtensionFromFormat(targetFormat);
  return `${base}_${suffix}.${ext}`;
}

export function buildOutputPath(
  storage: LocalStorageService,
  fileName: string,
): string {
  return storage.buildFilePath('PROCESSED', fileName);
}

export async function finalizeJob(
  options: {
    jobId: string;
    output: ProcessedOutput;
    repo: ImageJobRepository;
    sharp: SharpService;
    logger: Logger;
  },
): Promise<void> {
  const { jobId, output, repo, sharp, logger } = options;
  const meta = await sharp.extractMetadata(output.outputPath);
  await repo.addFile({
    jobId,
    kind: ImageFileKind.OUTPUT,
    filePath: output.outputPath,
    fileName: output.fileName,
    mimeType: output.mimeType,
    sizeBytes: meta.size || output.sizeBytes,
    width: meta.width ?? output.width,
    height: meta.height ?? output.height,
    format: toImageFormatEnum(output.format),
    hasAlpha: meta.hasAlpha,
  });
  await repo.updateProgress(jobId, 100);
  await repo.markCompleted(jobId);
  await repo.addHistory(jobId, ImageEventType.COMPLETED, 'Output file ready');
  logger.log(`Job ${jobId} completed → ${path.basename(output.outputPath)}`);
}

export function toImageFormatEnum(format: string): ImageFormat {
  switch (format.toLowerCase()) {
    case 'jpeg':
    case 'jpg':
      return ImageFormat.JPEG;
    case 'png':
      return ImageFormat.PNG;
    case 'webp':
      return ImageFormat.WEBP;
    case 'avif':
      return ImageFormat.AVIF;
    default:
      return ImageFormat.PNG;
  }
}

export function mimeForFormat(format: string): string {
  return inferMimeFromFormat(format);
}
