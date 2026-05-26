import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
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

/**
 * Wraps `sharp` for image-format conversions (PNG ↔ JPG ↔ WebP).
 *
 * Conversion pipeline:
 *   1. Open with `failOn: 'error'` so silent decode failures throw early.
 *   2. Auto-rotate by EXIF then strip the orientation tag (prevents double rotation).
 *   3. Convert with format-specific encoder options (mozjpeg, max png compression, webp effort).
 *   4. Write to disk and stat the resulting file.
 */
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

    let pipeline = sharp(inputPath, {
      failOn: 'error',
      limitInputPixels: 50_000_000,
    })
      .rotate()
      .withMetadata({ orientation: undefined });

    pipeline = pipeline.timeout({ seconds: Math.ceil(SHARP_TIMEOUT_MS / 1000) });

    try {
      switch (targetFormat) {
        case ConversionFileFormat.JPG:
          pipeline = pipeline.jpeg({ quality, mozjpeg: true, progressive: true });
          break;
        case ConversionFileFormat.PNG:
          pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
          break;
        case ConversionFileFormat.WEBP:
          pipeline = pipeline.webp({ quality, effort: 4 });
          break;
        default:
          throw new UnsupportedFileFormatException(
            `Image conversion does not support target format: ${targetFormat}`,
          );
      }

      await pipeline.toFile(outputPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown sharp error';
      this.logger.error(`Sharp conversion failed: ${message}`);
      if (error instanceof UnsupportedFileFormatException) throw error;
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

  private defaultQuality(format: ConversionFileFormat): number {
    switch (format) {
      case ConversionFileFormat.JPG:
      case ConversionFileFormat.WEBP:
        return 85;
      default:
        return 90;
    }
  }
}

function clampQuality(value: number): number {
  if (Number.isNaN(value)) return 85;
  return Math.min(100, Math.max(1, Math.trunc(value)));
}
