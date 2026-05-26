import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp, { FitEnum, Sharp } from 'sharp';
import {
  ImageProcessingException,
  UnsupportedImageFormatException,
} from '../../common/exceptions/business.exception';
import { ImageMetadata } from '../../common/interfaces';

export type TargetFormat = 'jpeg' | 'png' | 'webp' | 'avif';
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
      `Sharp initialized (max input pixels = ${this.maxInputPixels})`,
    );
  }

  async extractMetadata(filePath: string): Promise<ImageMetadata> {
    try {
      const meta = await sharp(filePath).metadata();
      return {
        width: meta.width,
        height: meta.height,
        format: meta.format,
        hasAlpha: meta.hasAlpha ?? false,
        size: meta.size ?? 0,
      };
    } catch (error) {
      throw new ImageProcessingException(
        `Failed to read image metadata: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async convert(
    inputPath: string,
    outputPath: string,
    options: ConvertOptions,
  ): Promise<{ width: number; height: number; format: string }> {
    const pipeline = this.basePipeline(inputPath);
    const finalized = this.applyOutputFormat(pipeline, options.format, options.quality);

    return await this.executePipeline(finalized, outputPath);
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

    return await this.executePipeline(finalized, outputPath);
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
      default:
        throw new UnsupportedImageFormatException(`Unsupported output format: ${String(format)}`);
    }
  }

  private async executePipeline(
    pipeline: Sharp,
    outputPath: string,
  ): Promise<{ width: number; height: number; format: string }> {
    try {
      const info = await pipeline.toFile(outputPath);
      return {
        width: info.width,
        height: info.height,
        format: info.format,
      };
    } catch (error) {
      throw new ImageProcessingException(
        `Sharp processing failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
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
      case 'png':
      default:
        return 'png';
    }
  }
}
