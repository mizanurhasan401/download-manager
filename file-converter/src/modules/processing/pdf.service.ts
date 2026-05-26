import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { PDFDocument } from 'pdf-lib';

export interface PdfMetadata {
  pageCount: number;
  title?: string;
  author?: string;
}

/**
 * Lightweight pdf-lib wrapper used for post-conversion metadata extraction
 * (page counts in history events, title sanitization, etc.). Kept independent
 * of the LibreOffice service so future PDF-only operations (merge, split,
 * watermark) can extend this without touching the document engine.
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async readMetadata(pdfPath: string): Promise<PdfMetadata | null> {
    try {
      const bytes = await fs.readFile(pdfPath);
      const doc = await PDFDocument.load(bytes, { updateMetadata: false });
      return {
        pageCount: doc.getPageCount(),
        title: doc.getTitle() ?? undefined,
        author: doc.getAuthor() ?? undefined,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to read PDF metadata: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }
}
