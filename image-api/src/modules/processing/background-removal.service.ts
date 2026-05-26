import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { promises as fs } from 'fs';
import { removeBackground } from '@imgly/background-removal-node';
import { ImageProcessingException } from '../../common/exceptions/business.exception';

@Injectable()
export class BackgroundRemovalService implements OnModuleInit {
  private readonly logger = new Logger(BackgroundRemovalService.name);
  private warmupPromise: Promise<void> | null = null;

  async onModuleInit(): Promise<void> {
    this.warmupPromise = this.warmup();
  }

  async removeBackground(inputPath: string): Promise<Buffer> {
    await this.ensureWarmedUp();

    try {
      const fileBuffer = await fs.readFile(inputPath);
      const blob = new Blob([new Uint8Array(fileBuffer)]);

      const resultBlob = await removeBackground(blob, {
        debug: false,
        output: { format: 'image/png', quality: 0.9 },
      });

      const arrayBuffer = await resultBlob.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      throw new ImageProcessingException(
        `Background removal failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  private async ensureWarmedUp(): Promise<void> {
    if (this.warmupPromise) {
      await this.warmupPromise;
    }
  }

  private async warmup(): Promise<void> {
    try {
      this.logger.log('Pre-warming background-removal model (first run may take ~5s)…');
      const sharp = (await import('sharp')).default;
      const seed = await sharp({
        create: {
          width: 8,
          height: 8,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .png()
        .toBuffer();
      const blob = new Blob([new Uint8Array(seed)]);
      await removeBackground(blob, { debug: false });
      this.logger.log('Background-removal model ready');
    } catch (error) {
      this.logger.warn(
        `Background-removal warmup failed (will retry on first request): ${error instanceof Error ? error.message : 'unknown'}`,
      );
      this.warmupPromise = null;
    }
  }
}
