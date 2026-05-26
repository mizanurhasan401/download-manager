import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { ConversionFileFormat } from '@prisma/client';

import { LIBREOFFICE_DEFAULT_TIMEOUT_MS } from '../../common/constants';
import {
  FileConversionException,
  UnsupportedConversionException,
} from '../../common/exceptions/business.exception';
import { ConvertedFileInfo } from '../../common/interfaces';
import { getExtensionForFormat, getMimeForFormat } from '../../common/utils';

const execFileAsync = promisify(execFile);

/**
 * Some source formats need an explicit input filter when targeting a writer
 * format. The default behavior opens PDFs in Draw, which then refuses any
 * Writer-only export filter (e.g. DOCX) with an I/O error.
 */
const INFILTER_OVERRIDES: Partial<
  Record<ConversionFileFormat, Partial<Record<ConversionFileFormat, string>>>
> = {
  [ConversionFileFormat.PDF]: {
    [ConversionFileFormat.DOCX]: 'writer_pdf_import',
  },
};

/**
 * LibreOffice headless CLI wrapper.
 *
 * Workflow per conversion:
 *   1. Create an isolated temp working directory so concurrent jobs cannot collide
 *      on LibreOffice's profile lock (`-env:UserInstallation`).
 *   2. Spawn `libreoffice --headless --convert-to <ext> --outdir <tempDir> <input>`.
 *   3. Move the produced artifact into the requested `outputPath`.
 *   4. Clean up the temp directory regardless of outcome.
 */
@Injectable()
export class LibreOfficeService implements OnModuleInit {
  private readonly logger = new Logger(LibreOfficeService.name);
  private readonly bin: string;
  private readonly timeoutMs: number;
  private binaryAvailable: boolean | null = null;

  constructor(private readonly configService: ConfigService) {
    this.bin = this.configService.get<string>(
      'processing.libreOfficeBin',
      'libreoffice',
    );
    this.timeoutMs = this.configService.get<number>(
      'processing.libreOfficeTimeoutMs',
      LIBREOFFICE_DEFAULT_TIMEOUT_MS,
    );
  }

  async onModuleInit(): Promise<void> {
    this.binaryAvailable = await this.probeBinary();
    if (this.binaryAvailable) {
      this.logger.log(`LibreOffice available (${this.bin})`);
    } else {
      this.logger.warn(
        `LibreOffice binary "${this.bin}" not detected on PATH — document conversions will fail until it is installed.`,
      );
    }
  }

  isAvailable(): boolean {
    return this.binaryAvailable === true;
  }

  /**
   * Convert a document file using LibreOffice headless.
   * @param inputPath absolute path to the source document
   * @param outputPath absolute destination path (extension must match `targetFormat`)
   * @param sourceFormat the source document format (needed so we can apply
   *        per-pair input-filter overrides like `writer_pdf_import` for PDF→DOCX)
   * @param targetFormat the desired output format
   */
  async convert(
    inputPath: string,
    outputPath: string,
    sourceFormat: ConversionFileFormat,
    targetFormat: ConversionFileFormat,
  ): Promise<ConvertedFileInfo> {
    if (!this.isAvailable()) {
      throw new FileConversionException(
        `LibreOffice binary not available ("${this.bin}"). Install LibreOffice to enable document conversion.`,
      );
    }

    const filter = this.getConversionFilter(targetFormat);
    if (!filter) {
      throw new UnsupportedConversionException(
        `LibreOffice cannot produce target format: ${targetFormat}`,
      );
    }

    const inFilter = INFILTER_OVERRIDES[sourceFormat]?.[targetFormat];

    const workDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'file-converter-lo-'),
    );

    try {
      const args = [
        '--headless',
        '--norestore',
        '--nolockcheck',
        '--nodefault',
        '--nofirststartwizard',
        `-env:UserInstallation=file://${workDir}/profile`,
        ...(inFilter ? [`--infilter=${inFilter}`] : []),
        '--convert-to',
        filter,
        '--outdir',
        workDir,
        inputPath,
      ];

      this.logger.debug(`Running: ${this.bin} ${args.join(' ')}`);

      try {
        await execFileAsync(this.bin, args, {
          timeout: this.timeoutMs,
          maxBuffer: 32 * 1024 * 1024,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'unknown libreoffice error';
        throw new FileConversionException(
          `LibreOffice failed: ${truncate(message, 300)}`,
        );
      }

      const producedName = `${path.basename(inputPath, path.extname(inputPath))}.${getExtensionForFormat(targetFormat)}`;
      const producedPath = path.join(workDir, producedName);

      try {
        await fs.access(producedPath);
      } catch {
        throw new FileConversionException(
          `LibreOffice produced no output at ${producedPath}`,
        );
      }

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.rename(producedPath, outputPath).catch(async (error) => {
        // Cross-device rename → fall back to copy + unlink
        if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error;
        await fs.copyFile(producedPath, outputPath);
        await fs.unlink(producedPath).catch(() => undefined);
      });

      const stat = await fs.stat(outputPath);
      return {
        outputPath,
        fileName: path.basename(outputPath),
        mimeType: getMimeForFormat(targetFormat),
        sizeBytes: stat.size,
        format: targetFormat,
      };
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private getConversionFilter(target: ConversionFileFormat): string | null {
    switch (target) {
      // Filter pinned to UNO export filter for predictable results.
      case ConversionFileFormat.PDF:
        return 'pdf';
      case ConversionFileFormat.DOCX:
        return 'docx:MS Word 2007 XML';
      default:
        return null;
    }
  }

  private async probeBinary(): Promise<boolean> {
    try {
      await execFileAsync(this.bin, ['--version'], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}
