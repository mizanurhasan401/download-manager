import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { DownloadEventType, DownloadStatus, MediaType } from '@prisma/client';
import * as path from 'path';
import { QUEUE_NAMES } from '../../../common/constants';
import { DownloadJobPayload } from '../../../common/interfaces';
import { FfmpegService } from '../../../common/services/ffmpeg.service';
import { LocalStorageService } from '../../../common/services/local-storage.service';
import {
  DownloadProgressUpdate,
  YtDlpService,
} from '../../../common/services/ytdlp.service';
import { sanitizeFileName } from '../../../common/utils';
import { DownloadRepository } from '../../downloads/repositories/download.repository';

const DB_PROGRESS_THROTTLE_MS = 1500;
const DB_PROGRESS_THROTTLE_DELTA = 2;

@Processor(QUEUE_NAMES.VIDEO_DOWNLOAD, {
  concurrency: parseInt(process.env.MAX_CONCURRENT_DOWNLOADS ?? '3', 10),
})
export class DownloadProcessor extends WorkerHost {
  private readonly logger = new Logger(DownloadProcessor.name);
  private readonly maxDownloadSizeBytes: number;

  constructor(
    private readonly ytDlpService: YtDlpService,
    private readonly ffmpegService: FfmpegService,
    private readonly storageService: LocalStorageService,
    private readonly downloadRepository: DownloadRepository,
    private readonly configService: ConfigService,
  ) {
    super();
    const maxMb = this.configService.get<number>(
      'downloader.maxDownloadSizeMb',
      2048,
    );
    this.maxDownloadSizeBytes = maxMb * 1024 * 1024;
  }

  async process(job: Job<DownloadJobPayload>): Promise<void> {
    const {
      downloadJobId,
      videoUrl,
      formatId,
      mediaType,
      title,
      audioBitrate,
      clipStartSeconds,
      clipEndSeconds,
    } = job.data;

    this.logger.log(`Processing download job ${downloadJobId}`);

    await this.downloadRepository.updateStatus(
      downloadJobId,
      DownloadStatus.PROCESSING,
      { startedAt: new Date(), progress: 0 },
    );

    await this.downloadRepository.addHistoryEvent(
      downloadJobId,
      DownloadEventType.STARTED,
      'Download processing started',
    );

    const clipRange = this.resolveClipRange(clipStartSeconds, clipEndSeconds);
    const tempDir = this.storageService.getDirectory('TEMP');
    const baseTitle = sanitizeFileName(title ?? downloadJobId);
    const safeTitle = clipRange
      ? `${baseTitle}_clip_${Math.round(clipRange.startSec)}-${Math.round(clipRange.endSec)}`
      : baseTitle;
    const tempOutput =
      mediaType === MediaType.VIDEO
        ? path.join(tempDir, `${safeTitle}.mp4`)
        : path.join(tempDir, `${safeTitle}.%(ext)s`);
    const effectiveFormatId = this.resolveFormatId(
      formatId,
      mediaType as MediaType,
    );

    const dbState = {
      lastWriteAt: 0,
      lastPercent: 0,
      lastPhase: '' as DownloadProgressUpdate['phase'] | '',
    };

    try {
      const downloadResult = await this.ytDlpService.download(
        videoUrl,
        effectiveFormatId,
        tempOutput,
        async (update) => {
          await job.updateProgress(update as unknown as object);

          const now = Date.now();
          const elapsed = now - dbState.lastWriteAt;
          const phaseChanged = update.phase !== dbState.lastPhase;
          const significantDelta =
            update.percent - dbState.lastPercent >= DB_PROGRESS_THROTTLE_DELTA;

          if (
            elapsed >= DB_PROGRESS_THROTTLE_MS ||
            phaseChanged ||
            significantDelta ||
            update.percent >= 100
          ) {
            dbState.lastWriteAt = now;
            dbState.lastPercent = update.percent;
            dbState.lastPhase = update.phase;

            await this.downloadRepository.updateProgress(
              downloadJobId,
              Math.min(Math.round(update.percent), 100),
              update.phaseLabel,
            );
          }
        },
        {
          totalPhases: this.estimateTotalPhases(
            effectiveFormatId,
            mediaType as MediaType,
          ),
          clip: clipRange ?? undefined,
        },
      );

      let finalPath = downloadResult.filePath;

      if (
        downloadResult.requiresMerge &&
        downloadResult.videoFilePath &&
        downloadResult.audioFilePath
      ) {
        await this.downloadRepository.updateStatus(
          downloadJobId,
          DownloadStatus.MERGING,
        );

        await this.downloadRepository.addHistoryEvent(
          downloadJobId,
          DownloadEventType.MERGING,
          'Merging video and audio streams',
        );

        await job.updateProgress({
          percent: 96,
          phase: 'MERGING',
          phaseLabel: 'Merging streams',
          phaseIndex: 0,
          totalPhases: 0,
          speedBytesPerSec: null,
          etaSeconds: null,
          downloadedBytes: null,
          totalBytes: null,
        } as unknown as object);

        const mergedPath = this.storageService.buildFilePath(
          'MERGED',
          `${safeTitle}.mp4`,
        );

        finalPath = await this.ffmpegService.mergeVideoAudio(
          downloadResult.videoFilePath,
          downloadResult.audioFilePath,
          mergedPath,
        );

        await this.ffmpegService.cleanupTempFiles(
          downloadResult.videoFilePath,
          downloadResult.audioFilePath,
        );
      }

      if (mediaType === MediaType.AUDIO) {
        await job.updateProgress({
          percent: 97,
          phase: 'POSTPROCESSING',
          phaseLabel: 'Converting audio',
          phaseIndex: 0,
          totalPhases: 0,
          speedBytesPerSec: null,
          etaSeconds: null,
          downloadedBytes: null,
          totalBytes: null,
        } as unknown as object);

        const audioPath = this.storageService.buildFilePath(
          'AUDIO',
          `${safeTitle}.mp3`,
        );
        finalPath = await this.ffmpegService.convertToAudio(
          finalPath,
          audioPath,
          {
            bitrateKbps: audioBitrate ?? 192,
            format: 'mp3',
          },
        );

        if (finalPath !== downloadResult.filePath) {
          await this.ffmpegService.cleanupTempFiles(downloadResult.filePath);
        }
      }

      const storageType =
        mediaType === MediaType.AUDIO ? 'AUDIO' : 'VIDEOS';

      const storedFile = await this.storageService.moveFile(
        finalPath,
        storageType,
        mediaType === MediaType.VIDEO
          ? `${safeTitle}.mp4`
          : path.basename(finalPath),
      );

      if (storedFile.size > this.maxDownloadSizeBytes) {
        await this.storageService.deleteFile(storedFile.path);
        throw new Error(
          `Download exceeds maximum allowed size of ${this.maxDownloadSizeBytes} bytes`,
        );
      }

      await this.downloadRepository.markCompleted(downloadJobId, {
        filePath: storedFile.path,
        fileName: storedFile.fileName,
        fileSize: BigInt(storedFile.size),
        mimeType: storedFile.mimeType,
      });

      await job.updateProgress({
        percent: 100,
        phase: 'FINISHED',
        phaseLabel: 'Completed',
        phaseIndex: 0,
        totalPhases: 0,
        speedBytesPerSec: null,
        etaSeconds: 0,
        downloadedBytes: storedFile.size,
        totalBytes: storedFile.size,
      } as unknown as object);

      this.logger.log(`Download job ${downloadJobId} completed`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown download error';

      await this.downloadRepository.markFailed(downloadJobId, message);
      this.logger.error(`Download job ${downloadJobId} failed: ${message}`);
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<DownloadJobPayload> | undefined, error: Error): void {
    this.logger.error(
      `Job ${job?.id ?? 'unknown'} failed: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<DownloadJobPayload>): void {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  private resolveFormatId(formatId: string, mediaType: MediaType): string {
    if (mediaType === MediaType.AUDIO) {
      return formatId;
    }

    if (formatId.includes('+') || formatId.startsWith('best')) {
      return formatId;
    }

    return `${formatId}+bestaudio/best`;
  }

  private estimateTotalPhases(
    formatId: string,
    mediaType: MediaType,
  ): number {
    if (mediaType === MediaType.AUDIO) return 1;
    return formatId.includes('+') ? 2 : 1;
  }

  private resolveClipRange(
    startSec?: number,
    endSec?: number,
  ): { startSec: number; endSec: number } | null {
    const hasStart = typeof startSec === 'number' && Number.isFinite(startSec);
    const hasEnd = typeof endSec === 'number' && Number.isFinite(endSec);

    if (!hasStart && !hasEnd) return null;

    const safeStart = hasStart ? Math.max(0, startSec as number) : 0;
    const safeEnd = hasEnd ? (endSec as number) : safeStart + 1;

    if (safeEnd <= safeStart) return null;

    return { startSec: safeStart, endSec: safeEnd };
  }
}
