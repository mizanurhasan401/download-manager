import { Injectable } from '@nestjs/common';
import {
  ConversionCategory,
  ConversionFileFormat,
} from '@prisma/client';
import { SUPPORTED_CONVERSIONS } from '../../common/constants';
import {
  UnsupportedConversionException,
} from '../../common/exceptions/business.exception';
import { ConvertedFileInfo } from '../../common/interfaces';
import { isImageFormat } from '../../common/utils';
import { LibreOfficeService } from './libreoffice.service';
import {
  ImageConversionOptions,
  SharpImageService,
} from './sharp-image.service';

export interface ConversionRequest {
  inputPath: string;
  outputPath: string;
  sourceFormat: ConversionFileFormat;
  targetFormat: ConversionFileFormat;
  parameters?: Record<string, unknown>;
}

/**
 * Routes a conversion request to the appropriate engine.
 *
 * - Image ↔ Image  → `SharpImageService`
 * - Anything involving documents (PDF, DOCX, PPTX, XLSX, TXT) → `LibreOfficeService`
 *
 * Centralizes the supported-pair check so processors and the upload service
 * share the exact same validation.
 */
@Injectable()
export class ConversionRouterService {
  constructor(
    private readonly sharpImage: SharpImageService,
    private readonly libreOffice: LibreOfficeService,
  ) {}

  resolveCategory(
    source: ConversionFileFormat,
    target: ConversionFileFormat,
  ): ConversionCategory {
    if (isImageFormat(source) && isImageFormat(target)) {
      return ConversionCategory.IMAGE;
    }
    return ConversionCategory.DOCUMENT;
  }

  assertSupported(
    source: ConversionFileFormat,
    target: ConversionFileFormat,
  ): void {
    const supported = SUPPORTED_CONVERSIONS.some(
      (pair) => pair.source === source && pair.target === target,
    );
    if (!supported) {
      throw new UnsupportedConversionException(
        `Conversion not supported: ${source} → ${target}`,
      );
    }
  }

  async convert(request: ConversionRequest): Promise<ConvertedFileInfo> {
    this.assertSupported(request.sourceFormat, request.targetFormat);
    const category = this.resolveCategory(
      request.sourceFormat,
      request.targetFormat,
    );

    if (category === ConversionCategory.IMAGE) {
      const opts: ImageConversionOptions = {
        quality:
          typeof request.parameters?.quality === 'number'
            ? (request.parameters.quality as number)
            : undefined,
      };
      return this.sharpImage.convert(
        request.inputPath,
        request.outputPath,
        request.targetFormat,
        opts,
      );
    }

    return this.libreOffice.convert(
      request.inputPath,
      request.outputPath,
      request.sourceFormat,
      request.targetFormat,
    );
  }
}
