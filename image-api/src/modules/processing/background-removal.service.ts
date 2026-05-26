import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { removeBackground } from '@imgly/background-removal-node';
import { ImageProcessingException } from '../../common/exceptions/business.exception';

@Injectable()
export class BackgroundRemovalService {
  private readonly logger = new Logger(BackgroundRemovalService.name);

  async removeBackground(inputPath: string): Promise<Buffer> {
    try {
      const pngBuffer = await this.normalizeToPng(inputPath);
      const blob = new Blob([new Uint8Array(pngBuffer)], { type: 'image/png' });

      this.logger.log('Running background-removal inference…');
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

  /**
   * The bg-removal library only accepts image/png, image/jpeg, image/webp and
   * dispatches on the Blob's MIME type. Pre-decoding through Sharp into PNG
   * gives us:
   *   - AVIF support (library has none)
   *   - EXIF auto-rotation
   *   - A guaranteed Blob.type the library can dispatch on (no more
   *     "Unsupported format" errors when an upstream forgets to set type)
   */
  private async normalizeToPng(inputPath: string): Promise<Buffer> {
    return sharp(inputPath, { failOn: 'error' })
      .rotate()
      .png({ compressionLevel: 6 })
      .toBuffer();
  }
}
