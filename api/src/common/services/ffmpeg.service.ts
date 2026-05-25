import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { FFMPEG_TIMEOUT_MS } from '../constants';
import { DownloaderNotAvailableException, StorageException } from '../exceptions/business.exception';
import { ProcessNotFoundError, spawnProcessSafe } from '../utils/process.util';
import { resolveExecutablePath } from '../utils/executable-path.util';

@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);
  private readonly ffmpegPath: string;

  constructor(private readonly configService: ConfigService) {
    const configuredPath = this.configService.get<string>(
      'downloader.ffmpegPath',
      'ffmpeg',
    );
    this.ffmpegPath = resolveExecutablePath(configuredPath);
  }

  async mergeVideoAudio(
    videoPath: string,
    audioPath: string,
    outputPath: string,
  ): Promise<string> {
    this.logger.debug(`Merging video and audio into ${outputPath}`);

    await this.ensureDirectory(path.dirname(outputPath));

    try {
      const result = await spawnProcessSafe(this.ffmpegPath, {
        args: [
          '-y',
          '-i',
          videoPath,
          '-i',
          audioPath,
          '-c:v',
          'copy',
          '-c:a',
          'aac',
          '-strict',
          'experimental',
          outputPath,
        ],
        timeoutMs: FFMPEG_TIMEOUT_MS,
      });

      if (result.exitCode !== 0) {
        this.logger.error(`FFmpeg merge failed: ${result.stderr}`);
        throw new StorageException(
          result.stderr || 'Failed to merge video and audio streams',
        );
      }

      return outputPath;
    } catch (error) {
      if (error instanceof ProcessNotFoundError) {
        throw new DownloaderNotAvailableException('ffmpeg', this.ffmpegPath);
      }

      throw error;
    }
  }

  async convertToAudio(inputPath: string, outputPath: string): Promise<string> {
    this.logger.debug(`Converting ${inputPath} to audio`);

    await this.ensureDirectory(path.dirname(outputPath));

    try {
      const result = await spawnProcessSafe(this.ffmpegPath, {
        args: [
          '-y',
          '-i',
          inputPath,
          '-vn',
          '-acodec',
          'libmp3lame',
          '-q:a',
          '2',
          outputPath,
        ],
        timeoutMs: FFMPEG_TIMEOUT_MS,
      });

      if (result.exitCode !== 0) {
        throw new StorageException(
          result.stderr || 'Failed to convert video to audio',
        );
      }

      return outputPath;
    } catch (error) {
      if (error instanceof ProcessNotFoundError) {
        throw new DownloaderNotAvailableException('ffmpeg', this.ffmpegPath);
      }

      throw error;
    }
  }

  async cleanupTempFiles(...filePaths: string[]): Promise<void> {
    await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          await fs.unlink(filePath);
          this.logger.debug(`Cleaned up temp file: ${filePath}`);
        } catch {
          this.logger.warn(`Failed to cleanup temp file: ${filePath}`);
        }
      }),
    );
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }
}
