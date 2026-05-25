import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueEvents } from 'bullmq';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { QUEUE_NAMES } from '../../../common/constants';
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

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.getOrThrow<string>('redis.host');
    const port = this.configService.getOrThrow<number>('redis.port');

    this.queueEvents = new QueueEvents(QUEUE_NAMES.VIDEO_DOWNLOAD, {
      connection: { host, port },
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      this.handleProgress(jobId, data);
    });

    this.queueEvents.on('completed', ({ jobId }) => {
      this.publish({
        jobId,
        status: 'completed',
        percent: 100,
        phase: 'FINISHED',
        phaseLabel: 'Completed',
        timestamp: Date.now(),
      });
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.publish({
        jobId,
        status: 'failed',
        errorMessage: failedReason,
        phase: 'FINISHED',
        phaseLabel: 'Failed',
        timestamp: Date.now(),
      });
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
