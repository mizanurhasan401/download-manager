import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { QUEUE_NAMES } from '../../../common/constants';
import { DownloadJobPayload } from '../../../common/interfaces';
import { normalizeYtDlpError } from '../../../common/utils/ytdlp-error.util';
import { DownloadProgressUpdate } from '../../../common/services/ytdlp.service';

export interface DownloadProgressEvent extends Partial<DownloadProgressUpdate> {
  jobId: string;
  status?: 'progress' | 'completed' | 'failed';
  errorMessage?: string;
  timestamp: number;
}

@Injectable()
export class DownloadProgressService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DownloadProgressService.name);
  private readonly subject = new Subject<DownloadProgressEvent>();
  private queueEvents?: QueueEvents;
  private readonly latestByJob = new Map<string, DownloadProgressEvent>();

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(QUEUE_NAMES.VIDEO_DOWNLOAD)
    private readonly downloadQueue: Queue<DownloadJobPayload>,
  ) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.getOrThrow<string>('redis.host');
    const port = this.configService.getOrThrow<number>('redis.port');

    this.queueEvents = new QueueEvents(QUEUE_NAMES.VIDEO_DOWNLOAD, {
      connection: { host, port },
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      void this.handleQueueEvent(jobId, 'progress', data);
    });

    this.queueEvents.on('completed', ({ jobId }) => {
      void this.handleQueueEvent(jobId, 'completed');
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      void this.handleQueueEvent(jobId, 'failed', failedReason);
    });

    await this.queueEvents.waitUntilReady();
    this.logger.log('Download progress event bus ready');
  }

  async onModuleDestroy(): Promise<void> {
    await this.queueEvents?.close();
  }

  observe(jobId: string): Observable<DownloadProgressEvent> {
    return this.subject.asObservable().pipe(
      filter((event) => event.jobId === jobId),
      map((event) => event),
    );
  }

  getLatest(jobId: string): DownloadProgressEvent | undefined {
    return this.latestByJob.get(jobId);
  }

  private async handleQueueEvent(
    queueJobId: string,
    status: 'progress' | 'completed' | 'failed',
    data?: unknown,
  ): Promise<void> {
    const downloadJobId = await this.resolveDownloadJobId(queueJobId);

    if (status === 'progress') {
      this.handleProgress(downloadJobId, data);
      return;
    }

    if (status === 'completed') {
      this.publish({
        jobId: downloadJobId,
        status: 'completed',
        percent: 100,
        phase: 'FINISHED',
        phaseLabel: 'Completed',
        timestamp: Date.now(),
      });
      return;
    }

    const failedReason =
      typeof data === 'string' ? data : 'Download failed unexpectedly';
    const normalized = normalizeYtDlpError(failedReason);

    this.publish({
      jobId: downloadJobId,
      status: 'failed',
      errorMessage: normalized.message,
      phase: 'FINISHED',
      phaseLabel: 'Failed',
      timestamp: Date.now(),
    });
  }

  private async resolveDownloadJobId(queueJobId: string): Promise<string> {
    try {
      const job = await this.downloadQueue.getJob(queueJobId);
      if (job?.data?.downloadJobId) {
        return job.data.downloadJobId;
      }
    } catch (error) {
      this.logger.warn(
        `Could not resolve downloadJobId for queue job ${queueJobId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

    return queueJobId;
  }

  private handleProgress(jobId: string, data: unknown): void {
    if (data === null || data === undefined) return;

    const update = this.normalizeProgressData(data);
    this.publish({
      jobId,
      status: 'progress',
      ...update,
      timestamp: Date.now(),
    });
  }

  private normalizeProgressData(
    data: unknown,
  ): Partial<DownloadProgressUpdate> {
    if (typeof data === 'number') {
      return {
        percent: data,
        phase: 'DOWNLOADING',
        phaseLabel: 'Downloading',
      };
    }

    if (typeof data === 'object') {
      return data as Partial<DownloadProgressUpdate>;
    }

    return {};
  }

  private publish(event: DownloadProgressEvent): void {
    this.latestByJob.set(event.jobId, event);
    this.subject.next(event);

    if (event.status === 'completed' || event.status === 'failed') {
      setTimeout(() => this.latestByJob.delete(event.jobId), 30_000);
    }
  }
}
