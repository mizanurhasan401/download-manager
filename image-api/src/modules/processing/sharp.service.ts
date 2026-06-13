import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import sharp, { FitEnum, Sharp } from 'sharp';
import {
  ImageProcessingException,
  UnsupportedImageFormatException,
} from '../../common/exceptions/business.exception';
import { isFallbackExtension, isHeicExtension } from '../../common/utils';
import { ImageMetadata } from '../../common/interfaces';

export type TargetFormat =
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'avif'
  | 'heic'
  | 'gif'
  | 'tiff';

export type ResizeFitOption = keyof FitEnum;

export interface ConvertOptions {
  format: TargetFormat;
  quality?: number;
}

export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: ResizeFitOption;
  format?: TargetFormat;
  quality?: number;
}

@Injectable()
export class SharpService implements OnModuleInit {
  private readonly logger = new Logger(SharpService.name);
  private maxInputPixels = 25_000_000;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.maxInputPixels = this.configService.get<number>(
      'processing.maxInputPixels',
      25_000_000,
    );
    sharp.cache(false);
    sharp.concurrency(1);
    this.logger.log(
      `Sharp initialized (max input pixels = ${this.maxInputPixels}); HEIC requires libheif — see deploy/HEIC-SETUP.md`,
    );
  }

  async extractMetadata(filePath: string): Promise<ImageMetadata> {
    try {
      const meta = await sharp(filePath, {
        limitInputPixels: this.maxInputPixels,
        failOn: 'error',
      }).metadata();
      return {
        width: meta.width,
        height: meta.height,
        format: meta.format,
        hasAlpha: meta.hasAlpha ?? false,
        size: meta.size ?? 0,
      };
    } catch (error) {
      throw this.wrapSharpError(error, filePath, 'read metadata');
    }
  }

  async convert(
    inputPath: string,
    outputPath: string,
    options: ConvertOptions,
  ): Promise<{ width: number; height: number; format: string }> {
    const pipeline = this.basePipeline(inputPath);
    const finalized = this.applyOutputFormat(pipeline, options.format, options.quality);

    return await this.executePipeline(finalized, outputPath, inputPath);
  }

  async resize(
    inputPath: string,
    outputPath: string,
    options: ResizeOptions,
  ): Promise<{ width: number; height: number; format: string }> {
    if (!options.width && !options.height) {
      throw new ImageProcessingException('Resize requires width or height');
    }

    const meta = await this.extractMetadata(inputPath);
    const pipeline = this.basePipeline(inputPath).resize({
      width: options.width,
      height: options.height,
      fit: options.fit ?? 'cover',
      withoutEnlargement: false,
    });

    const targetFormat = options.format ?? this.normalizeFormat(meta.format);
    const finalized = this.applyOutputFormat(pipeline, targetFormat, options.quality);

    return await this.executePipeline(finalized, outputPath, inputPath);
  }

  async finalizeBuffer(
    buffer: Buffer,
    outputPath: string,
    format: TargetFormat = 'png',
    quality?: number,
  ): Promise<{ width: number; height: number; format: string }> {
    const pipeline = sharp(buffer, {
      limitInputPixels: this.maxInputPixels,
      failOn: 'error',
    });
    const finalized = this.applyOutputFormat(pipeline, format, quality);
    return await this.executePipeline(finalized, outputPath);
  }

  private basePipeline(inputPath: string): Sharp {
    return sharp(inputPath, {
      limitInputPixels: this.maxInputPixels,
      failOn: 'error',
    })
      .rotate()
      .withMetadata({ orientation: undefined });
  }

  private applyOutputFormat(
    pipeline: Sharp,
    format: TargetFormat,
    quality?: number,
  ): Sharp {
    const q = Math.min(Math.max(quality ?? 82, 1), 100);
    switch (format) {
      case 'jpeg':
        return pipeline.jpeg({ quality: q, mozjpeg: true, progressive: true });
      case 'png':
        return pipeline
          .ensureAlpha()
          .png({ compressionLevel: 9, palette: false });
      case 'webp':
        return pipeline.webp({ quality: q, effort: 4 });
      case 'avif':
        return pipeline.avif({ quality: q, effort: 4 });
      case 'heic':
        return pipeline.heif({ quality: q, compression: 'hevc' });
      case 'gif':
        return pipeline.gif();
      case 'tiff':
        return pipeline.tiff({ compression: 'lzw' });
      default:
        throw new UnsupportedImageFormatException(`Unsupported output format: ${String(format)}`);
    }
  }

  private async executePipeline(
    pipeline: Sharp,
    outputPath: string,
    inputPath?: string,
  ): Promise<{ width: number; height: number; format: string }> {
    try {
      const info = await pipeline.toFile(outputPath);
      return {
        width: info.width,
        height: info.height,
        format: info.format,
      };
    } catch (error) {
      throw this.wrapSharpError(
        error,
        inputPath ?? outputPath,
        'process image',
      );
    }
  }

  private isHeicPath(filePath: string, format?: string | null): boolean {
    if (format === 'heif' || format === 'heic') {
      return true;
    }
    return isHeicExtension(path.basename(filePath));
  }

  private wrapSharpError(
    error: unknown,
    filePath: string,
    action: string,
  ): ImageProcessingException {
    const message = error instanceof Error ? error.message : 'unknown';
    if (
      this.isHeicPath(filePath) &&
      /heif|heic|libheif|bad seek|unsupported|compression format/i.test(message)
    ) {
      return new ImageProcessingException(
        'HEIC support requires libheif — see deploy/HEIC-SETUP.md',
      );
    }
    return new ImageProcessingException(`${action}: ${message}`);
  }

  private normalizeFormat(format: string | undefined): TargetFormat {
    switch ((format ?? 'png').toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        return 'jpeg';
      case 'webp':
        return 'webp';
      case 'avif':
        return 'avif';
      case 'heif':
      case 'heic':
        return 'jpeg';
      case 'gif':
        return 'gif';
      case 'tiff':
      case 'tif':
        return 'tiff';
      case 'bmp':
        return 'png';
      case 'png':
      default:
        return 'png';
    }
  }
}
