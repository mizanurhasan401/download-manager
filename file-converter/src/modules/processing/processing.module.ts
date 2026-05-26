import { Global, Module } from '@nestjs/common';
import { ConversionRouterService } from './conversion-router.service';
import { LibreOfficeService } from './libreoffice.service';
import { PdfService } from './pdf.service';
import { SharpImageService } from './sharp-image.service';

@Global()
@Module({
  providers: [
    SharpImageService,
    LibreOfficeService,
    PdfService,
    ConversionRouterService,
  ],
  exports: [
    SharpImageService,
    LibreOfficeService,
    PdfService,
    ConversionRouterService,
  ],
})
export class ProcessingModule {}
