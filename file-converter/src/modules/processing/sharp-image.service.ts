import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { ConversionFileFormat } from '@prisma/client';
import { SHARP_TIMEOUT_MS } from '../../common/constants';
import {
  FileConversionException,
  UnsupportedFileFormatException,
} from '../../common/exceptions/business.exception';
import { ConvertedFileInfo } from '../../common/interfaces';
import { getMimeForFormat } from '../../common/utils';

export interface ImageConversionOptions {
  /** Image quality 1–100, applies to lossy formats. Default 85. */
  quality?: number;
}

@Injectable()
export class SharpImageService {
  private readonly logger = new Logger(SharpImageService.name);

  async convert(
    inputPath: string,
    outputPath: string,
    targetFormat: ConversionFileFormat,
    options: ImageConversionOptions = {},
  ): Promise<ConvertedFileInfo> {
    const quality = clampQuality(options.quality ?? this.defaultQuality(targetFormat));
    const sourceIsHeic = this.isHeicSource(inputPath);

    if (sourceIsHeic) {
      this.logger.debug(`Decoding HEIC input: ${path.basename(inputPath)}`);
    }

    let pipeline = sharp(inputPath, {
      failOn: 'error',
      limitInputPixels: 50_000_000,
    })
      .rotate()
      .withMetadata({ orientation: undefined });

    pipeline = pipeline.timeout({ seconds: Math.ceil(SHARP_TIMEOUT_MS / 1000) });

    try {
      pipeline = this.applyTargetFormat(pipeline, targetFormat, quality);
      await pipeline.toFile(outputPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown sharp error';
      this.logger.error(`Sharp conversion failed: ${message}`);
      if (error instanceof UnsupportedFileFormatException) throw error;
      if (
        (sourceIsHeic || targetFormat === ConversionFileFormat.HEIC) &&
        /heif|heic|libheif|bad seek|unsupported|compression format/i.test(message)
      ) {
        throw new FileConversionException(
          'HEIC support requires libheif — see deploy/HEIC-SETUP.md',
        );
      }
      throw new FileConversionException(`Image conversion failed: ${message}`);
    }

    const stat = await fs.stat(outputPath);
    return {
      outputPath,
      fileName: outputPath.split('/').pop()!,
      mimeType: getMimeForFormat(targetFormat),
      sizeBytes: stat.size,
      format: targetFormat,
    };
  }

  private applyTargetFormat(
    pipeline: sharp.Sharp,
    targetFormat: ConversionFileFormat,
    quality: number,
  ): sharp.Sharp {
    switch (targetFormat) {
      case ConversionFileFormat.JPG:
        return pipeline.jpeg({ quality, mozjpeg: true, progressive: true });
      case ConversionFileFormat.PNG:
        return pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
      case ConversionFileFormat.WEBP:
        return pipeline.webp({ quality, effort: 4 });
      case ConversionFileFormat.HEIC:
        return pipeline.heif({ quality, compression: 'hevc' });
      case ConversionFileFormat.GIF:
        return pipeline.gif();
      case ConversionFileFormat.TIFF:
        return pipeline.tiff({ compression: 'lzw' });
      default:
        throw new UnsupportedFileFormatException(
          `Image conversion does not support target format: ${targetFormat}`,
        );
    }
  }

  private defaultQuality(format: ConversionFileFormat): number {
    switch (format) {
      case ConversionFileFormat.JPG:
      case ConversionFileFormat.WEBP:
      case ConversionFileFormat.HEIC:
        return 85;
      default:
        return 90;
    }
  }

  private isHeicSource(inputPath: string): boolean {
    const ext = path.extname(inputPath).toLowerCase();
    return ext === '.heic' || ext === '.heif';
  }
}

function clampQuality(value: number): number {
  if (Number.isNaN(value)) return 85;
  return Math.min(100, Math.max(1, Math.trunc(value)));
}
