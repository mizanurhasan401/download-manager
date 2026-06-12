import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DownloaderNotAvailableException,
  YtDlpExecutionException,
} from '../../common/exceptions/business.exception';
import {
  YtDlpFormat,
  YtDlpMetadata,
  YtDlpPlaylistMetadata,
} from '../../common/interfaces';
import { resolveExecutablePath } from '../../common/utils/executable-path.util';
import { normalizeYtDlpError } from '../../common/utils/ytdlp-error.util';
import { ProcessNotFoundError, spawnProcessSafe } from '../../common/utils/process.util';
import { promises as fs } from 'fs';
import * as path from 'path';

export type DownloadPhase =
  | 'PREPARING'
  | 'DOWNLOADING_VIDEO'
  | 'DOWNLOADING_AUDIO'
  | 'DOWNLOADING'
  | 'MERGING'
  | 'POSTPROCESSING'
  | 'FINISHED';

export interface DownloadProgressUpdate {
  percent: number;
  phase: DownloadPhase;
  phaseLabel: string;
  phaseIndex: number;
  totalPhases: number;
  speedBytesPerSec: number | null;
  etaSeconds: number | null;
  downloadedBytes: number | null;
  totalBytes: number | null;
  rawLine?: string;
}

export type DownloadProgressCallback = (
  update: DownloadProgressUpdate,
) => void | Promise<void>;

export interface DownloadResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  requiresMerge: boolean;
  videoFilePath?: string;
  audioFilePath?: string;
}

export interface DownloadClipRange {
  startSec: number;
  endSec: number;
}

export interface DownloadOptions {
  totalPhases?: number;
  clip?: DownloadClipRange;
}

const DOWNLOAD_PERCENT_BUDGET = 95;

@Injectable()
export class YtDlpService implements OnModuleInit {
  private readonly logger = new Logger(YtDlpService.name);
  private readonly ytdlpPath: string;
  private cookiesFilePath: string | null = null;

  constructor(private readonly configService: ConfigService) {
    const configuredPath = this.configService.get<string>(
      'downloader.ytdlpPath',
      'yt-dlp',
    );
    this.ytdlpPath = resolveExecutablePath(configuredPath);
  }

  async onModuleInit(): Promise<void> {
    const configuredCookies = this.configService.get<string>(
      'downloader.cookiesFile',
    );

    if (!configuredCookies) {
      return;
    }

    try {
      await fs.access(configuredCookies);
      this.cookiesFilePath = configuredCookies;
      this.logger.log(`Using yt-dlp cookies file: ${configuredCookies}`);
    } catch {
      this.logger.warn(
        `YTDLP_COOKIES_FILE is set but file not found: ${configuredCookies}`,
      );
    }
  }

  async extractMetadata(url: string): Promise<YtDlpMetadata> {
    this.logger.debug(`Extracting metadata for: ${url}`);

    try {
      const result = await spawnProcessSafe(this.ytdlpPath, {
        args: [...this.buildCommonArgs(), '--no-playlist', '--no-warnings', '-J', url],
        timeoutMs: this.getTimeoutMs(),
      });

      if (result.exitCode !== 0) {
        this.logger.error(`yt-dlp metadata failed: ${result.stderr}`);
        const normalized = normalizeYtDlpError(
          result.stderr || 'Failed to extract video metadata',
        );
        throw new YtDlpExecutionException(
          normalized.message,
          normalized.code,
        );
      }

      try {
        return JSON.parse(result.stdout) as YtDlpMetadata;
      } catch {
        throw new YtDlpExecutionException(
          'Invalid metadata response from yt-dlp',
        );
      }
    } catch (error) {
      if (error instanceof ProcessNotFoundError) {
        throw new DownloaderNotAvailableException('yt-dlp', this.ytdlpPath);
      }

      throw error;
    }
  }

  async extractPlaylistMetadata(
    url: string,
    options: { maxItems?: number } = {},
  ): Promise<YtDlpPlaylistMetadata> {
    this.logger.debug(`Extracting playlist metadata for: ${url}`);

    const args = [
      ...this.buildCommonArgs(),
      '--yes-playlist',
      '--flat-playlist',
      '--no-warnings',
      '-J',
    ];

    if (options.maxItems && options.maxItems > 0) {
      args.push('--playlist-end', String(options.maxItems));
    }

    args.push(url);

    try {
      const result = await spawnProcessSafe(this.ytdlpPath, {
        args,
        timeoutMs: this.getTimeoutMs(),
      });

      if (result.exitCode !== 0) {
        this.logger.error(`yt-dlp playlist metadata failed: ${result.stderr}`);
        const normalized = normalizeYtDlpError(
          result.stderr || 'Failed to extract playlist metadata',
        );
        throw new YtDlpExecutionException(
          normalized.message,
          normalized.code,
        );
      }

      let parsed: YtDlpPlaylistMetadata;
      try {
        parsed = JSON.parse(result.stdout) as YtDlpPlaylistMetadata;
      } catch {
        throw new YtDlpExecutionException(
          'Invalid playlist metadata response from yt-dlp',
        );
      }

      if (
        !parsed ||
        (parsed._type && parsed._type !== 'playlist' && parsed._type !== 'multi_video')
      ) {
        throw new YtDlpExecutionException('URL does not point to a playlist');
      }

      return parsed;
    } catch (error) {
      if (error instanceof ProcessNotFoundError) {
        throw new DownloaderNotAvailableException('yt-dlp', this.ytdlpPath);
      }

      throw error;
    }
  }

  getAvailableFormats(metadata: YtDlpMetadata): YtDlpFormat[] {
    const formats = metadata.formats ?? [];

    return formats
      .filter((format) => format.format_id && format.ext)
      .map((format) => ({
        ...format,
        filesize: format.filesize ?? format.filesize_approx,
      }))
      .sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
  }

  async download(
    url: string,
    formatId: string,
    outputPath: string,
    onProgress?: DownloadProgressCallback,
    options: DownloadOptions = {},
  ): Promise<DownloadResult> {
    this.logger.debug(`Downloading ${url} with format ${formatId}`);

    const totalPhases = options.totalPhases ?? this.estimatePhases(formatId);
    const tracker = new ProgressTracker(totalPhases);
    let stderrLog = '';

    const baseArgs = [
      ...this.buildCommonArgs(),
      '--no-playlist',
      '--no-warnings',
      '--newline',
      '--no-part',
      '--progress',
      '--merge-output-format',
      'mp4',
      '-f',
      formatId,
      '-o',
      outputPath,
    ];

    if (options.clip) {
      const { startSec, endSec } = options.clip;
      this.logger.debug(`Clipping range: ${startSec}s - ${endSec}s`);
      baseArgs.push(
        '--download-sections',
        `*${startSec}-${endSec}`,
        '--force-keyframes-at-cuts',
      );
    }

    baseArgs.push(url);

    try {
      const result = await spawnProcessSafe(this.ytdlpPath, {
        args: baseArgs,
        timeoutMs: this.getTimeoutMs(),
        onStderr: (chunk) => {
          stderrLog += chunk;
          this.handleProgressChunk(chunk, tracker, onProgress);
        },
        onStdout: (chunk) => {
          this.handleProgressChunk(chunk, tracker, onProgress);
        },
      });

      if (result.exitCode !== 0) {
        this.logger.error(`yt-dlp download failed: ${result.stderr}`);
        const normalized = normalizeYtDlpError(
          result.stderr || stderrLog || 'Failed to download video',
        );
        throw new YtDlpExecutionException(
          normalized.message,
          normalized.code,
        );
      }

      const downloadedPath = await this.resolveDownloadedPath(
        outputPath,
        result.stdout,
        result.stderr || stderrLog,
      );

      const stats = await fs.stat(downloadedPath);

      if (onProgress) {
        await onProgress(tracker.buildFinishedUpdate());
      }

      return {
        filePath: downloadedPath,
        fileName: path.basename(downloadedPath),
        fileSize: stats.size,
        requiresMerge: this.checkRequiresMerge(formatId),
      };
    } catch (error) {
      if (error instanceof ProcessNotFoundError) {
        throw new DownloaderNotAvailableException('yt-dlp', this.ytdlpPath);
      }

      throw error;
    }
  }

  private buildCommonArgs(): string[] {
    const args: string[] = [];

    if (this.cookiesFilePath) {
      args.push('--cookies', this.cookiesFilePath);
    }

    const proxy = this.configService.get<string>('downloader.proxy');
    if (proxy) {
      args.push('--proxy', proxy);
    }

    const retries = this.configService.get<number>('downloader.retries', 3);
    args.push('--retries', String(retries));
    args.push('--fragment-retries', String(retries));

    return args;
  }

  private getTimeoutMs(): number {
    return this.configService.get<number>('downloader.timeoutMs', 300_000);
  }

  private handleProgressChunk(
    chunk: string,
    tracker: ProgressTracker,
    onProgress?: DownloadProgressCallback,
  ): void {
    if (!onProgress) return;

    const lines = chunk.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const update = tracker.consumeLine(trimmed);
      if (update) {
        void onProgress(update);
      }
    }
  }

  private estimatePhases(formatId: string): number {
    if (formatId.includes('+')) return 2;
    return 1;
  }

  private async resolveDownloadedPath(
    outputPath: string,
    stdout: string,
    stderr: string,
  ): Promise<string> {
    const log = `${stdout}\n${stderr}`;

    const mergeMatch = log.match(/\[Merger\] Merging formats into "(.+?)"/);
    if (mergeMatch) {
      const mergedPath = mergeMatch[1].trim();
      if (await this.pathExists(mergedPath)) {
        return mergedPath;
      }
    }

    const destinationMatches = [
      ...log.matchAll(/\[download\] Destination: (.+)/g),
    ];

    for (let index = destinationMatches.length - 1; index >= 0; index -= 1) {
      const candidate = destinationMatches[index][1].trim();
      if (!(await this.pathExists(candidate))) {
        continue;
      }

      if (!this.isIntermediateStreamFile(candidate)) {
        return candidate;
      }
    }

    const scanned = await this.scanOutputDirectory(outputPath);
    if (scanned) {
      return scanned;
    }

    throw new YtDlpExecutionException(
      'Download finished but the output file could not be located on disk',
    );
  }

  private isIntermediateStreamFile(filePath: string): boolean {
    return /\.f[\d+]+v?\./i.test(path.basename(filePath));
  }

  private async scanOutputDirectory(outputPath: string): Promise<string | null> {
    const directory = path.dirname(outputPath);
    const baseName = path
      .basename(outputPath)
      .replace('.%(ext)s', '')
      .replace('%(ext)s', '')
      .replace(/\.[^.]+$/, '');

    let entries: string[];
    try {
      entries = await fs.readdir(directory);
    } catch {
      return null;
    }

    const candidates = await Promise.all(
      entries
        .filter((entry) => entry.startsWith(baseName))
        .map(async (entry) => {
          const fullPath = path.join(directory, entry);
          const stats = await fs.stat(fullPath);
          return { fullPath, entry, stats };
        }),
    );

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => {
      const aMerged = a.entry === `${baseName}.mp4` ? 1 : 0;
      const bMerged = b.entry === `${baseName}.mp4` ? 1 : 0;
      if (aMerged !== bMerged) return bMerged - aMerged;

      const aIntermediate = this.isIntermediateStreamFile(a.fullPath) ? 1 : 0;
      const bIntermediate = this.isIntermediateStreamFile(b.fullPath) ? 1 : 0;
      if (aIntermediate !== bIntermediate) return aIntermediate - bIntermediate;

      return b.stats.size - a.stats.size;
    });

    return candidates[0]?.fullPath ?? null;
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private checkRequiresMerge(formatId: string): boolean {
    return formatId.includes('+');
  }
}

class ProgressTracker {
  private currentPhaseIndex = 0;
  private currentPhase: DownloadPhase = 'PREPARING';
  private currentPhaseLabel = 'Preparing download';
  private lastEmittedPercent = 0;
  private latestStreamPercent = 0;
  private latestSpeed: number | null = null;
  private latestEta: number | null = null;
  private latestDownloaded: number | null = null;
  private latestTotal: number | null = null;
  private destinationsSeen = 0;

  constructor(private readonly totalPhases: number) {}

  consumeLine(line: string): DownloadProgressUpdate | null {
    const destinationMatch = line.match(/\[download\] Destination:\s+(.+)/);
    if (destinationMatch) {
      this.destinationsSeen += 1;
      this.currentPhaseIndex = Math.min(
        this.destinationsSeen,
        this.totalPhases,
      );
      const fileName = destinationMatch[1].trim();
      const isAudio = /\.f\d+a?\.(m4a|webm|aac|opus|mp3)$/i.test(fileName);

      if (this.totalPhases <= 1) {
        this.currentPhase = 'DOWNLOADING';
        this.currentPhaseLabel = 'Downloading';
      } else if (this.currentPhaseIndex === 1) {
        this.currentPhase = 'DOWNLOADING_VIDEO';
        this.currentPhaseLabel = 'Downloading video';
      } else if (isAudio || this.currentPhaseIndex === 2) {
        this.currentPhase = 'DOWNLOADING_AUDIO';
        this.currentPhaseLabel = 'Downloading audio';
      }

      this.latestStreamPercent = 0;

      return this.buildUpdate(line);
    }

    if (/^\[Merger\]/.test(line)) {
      this.currentPhase = 'MERGING';
      this.currentPhaseLabel = 'Merging streams';
      this.currentPhaseIndex = this.totalPhases;
      this.latestStreamPercent = 100;
      return this.buildUpdate(line);
    }

    if (/^\[(?:ExtractAudio|VideoConvertor|FixupM4a|FixupTimestamp)\]/.test(line)) {
      this.currentPhase = 'POSTPROCESSING';
      this.currentPhaseLabel = 'Post-processing';
      this.currentPhaseIndex = this.totalPhases;
      this.latestStreamPercent = 100;
      return this.buildUpdate(line);
    }

    const downloadMatch = line.match(
      /\[download\]\s+(\d+(?:\.\d+)?)%\s+of\s+~?\s*([\d.]+)\s*([KMGT]?i?B)\s*(?:at\s+([\d.]+|Unknown)\s*([KMGT]?i?B)?(?:\/s)?\s*(?:ETA\s+(\d{1,2}:\d{2}(?::\d{2})?|Unknown))?)?/i,
    );

    if (downloadMatch) {
      if (this.currentPhaseIndex === 0) {
        this.currentPhaseIndex = 1;
        this.currentPhase =
          this.totalPhases > 1 ? 'DOWNLOADING_VIDEO' : 'DOWNLOADING';
        this.currentPhaseLabel =
          this.totalPhases > 1 ? 'Downloading video' : 'Downloading';
      }

      const percent = parseFloat(downloadMatch[1]);
      const totalBytes = parseSizeToBytes(downloadMatch[2], downloadMatch[3]);
      const speedValue = downloadMatch[4];
      const speedUnit = downloadMatch[5];
      const eta = downloadMatch[6];

      this.latestStreamPercent = percent;
      this.latestTotal = totalBytes;
      this.latestDownloaded = totalBytes !== null ? (totalBytes * percent) / 100 : null;
      this.latestSpeed =
        speedValue && speedValue !== 'Unknown' && speedUnit
          ? parseSizeToBytes(speedValue, speedUnit)
          : null;
      this.latestEta = eta && eta !== 'Unknown' ? parseEtaToSeconds(eta) : null;

      return this.buildUpdate(line);
    }

    return null;
  }

  buildFinishedUpdate(): DownloadProgressUpdate {
    this.currentPhase = 'FINISHED';
    this.currentPhaseLabel = 'Finalizing';
    this.lastEmittedPercent = 100;

    return {
      percent: 100,
      phase: this.currentPhase,
      phaseLabel: this.currentPhaseLabel,
      phaseIndex: this.totalPhases,
      totalPhases: this.totalPhases,
      speedBytesPerSec: null,
      etaSeconds: 0,
      downloadedBytes: this.latestTotal,
      totalBytes: this.latestTotal,
    };
  }

  private buildUpdate(rawLine: string): DownloadProgressUpdate {
    const overallPercent = this.computeOverallPercent();

    if (overallPercent < this.lastEmittedPercent && overallPercent !== 0) {
      return {
        percent: this.lastEmittedPercent,
        phase: this.currentPhase,
        phaseLabel: this.currentPhaseLabel,
        phaseIndex: this.currentPhaseIndex,
        totalPhases: this.totalPhases,
        speedBytesPerSec: this.latestSpeed,
        etaSeconds: this.latestEta,
        downloadedBytes: this.latestDownloaded,
        totalBytes: this.latestTotal,
        rawLine,
      };
    }

    this.lastEmittedPercent = overallPercent;

    return {
      percent: overallPercent,
      phase: this.currentPhase,
      phaseLabel: this.currentPhaseLabel,
      phaseIndex: this.currentPhaseIndex,
      totalPhases: this.totalPhases,
      speedBytesPerSec: this.latestSpeed,
      etaSeconds: this.latestEta,
      downloadedBytes: this.latestDownloaded,
      totalBytes: this.latestTotal,
      rawLine,
    };
  }

  private computeOverallPercent(): number {
    if (this.currentPhase === 'FINISHED') return 100;

    if (this.currentPhase === 'MERGING' || this.currentPhase === 'POSTPROCESSING') {
      return Math.max(DOWNLOAD_PERCENT_BUDGET, this.lastEmittedPercent);
    }

    const phasesDone = Math.max(this.currentPhaseIndex - 1, 0);
    const perPhase = DOWNLOAD_PERCENT_BUDGET / Math.max(this.totalPhases, 1);
    const overall = phasesDone * perPhase + (this.latestStreamPercent / 100) * perPhase;

    return Math.min(Math.round(overall * 10) / 10, DOWNLOAD_PERCENT_BUDGET);
  }
}

function parseSizeToBytes(value: string, unit: string): number | null {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return null;

  const normalized = unit.toUpperCase().replace('I', '');
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
  };

  return num * (multipliers[normalized] ?? 1);
}

function parseEtaToSeconds(eta: string): number | null {
  const parts = eta.split(':').map((part) => parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return null;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] ?? null;
}
