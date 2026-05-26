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
      const rawCutout = Buffer.from(arrayBuffer);

      return await this.normalizeAlpha(rawCutout);
    } catch (error) {
      throw new ImageProcessingException(
        `Background removal failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  /**
   * The bg-removal model emits a soft-mask alpha channel whose maximum value is
   * 254 (not 255). On a dark UI background that 0.4% gap is invisible, but
   * any viewer that composites PNG transparency on white paints a faint white
   * wash over every "solid" pixel — which is exactly what the user sees when
   * they open the downloaded file in a native image viewer.
   *
   * Stretch the alpha channel so 254 → 255 while leaving RGB untouched. Edges
   * keep their anti-aliasing, background pixels stay fully transparent, and
   * subject pixels become genuinely opaque.
   */
  private async normalizeAlpha(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer, { failOn: 'error' })
      .ensureAlpha()
      .linear([1, 1, 1, 255 / 254], [0, 0, 0, 0])
      .png({ compressionLevel: 9, palette: false })
      .toBuffer();
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
