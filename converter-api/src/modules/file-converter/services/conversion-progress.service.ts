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
import { filter } from 'rxjs/operators';
import { ConversionJobStatus } from '@prisma/client';
import { QUEUE_NAMES } from '../../../common/constants';

export type ConversionProgressStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'CONVERTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface ConversionProgressEvent {
  jobId: string;
  status: ConversionProgressStatus;
  progress: number;
  phase?: string;
  errorMessage?: string;
  timestamp: number;
}

/**
 * Live progress bridge between the BullMQ WORKER process and SSE clients in
 * this HTTP process.
 *
 * Because processors run in a separate process, all progress crosses over
 * through Redis: the worker reports granular progress via `job.updateProgress`
 * (carrying the DB jobId + status + phase), and we relay those plus the native
 * `completed`/`failed` events onto an in-process RxJS subject the SSE endpoint
 * observes. Queue job ids are resolved back to DB job ids so subscribers keyed
 * on the DB id receive every event.
 *
 * Latest event per job is cached for ~30s so clients connecting right after a
 * terminal state still receive it.
 */
@Injectable()
export class ConversionProgressService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ConversionProgressService.name);
  private readonly subject = new Subject<ConversionProgressEvent>();
  private readonly latestByJob = new Map<string, ConversionProgressEvent>();
  private queueEvents: QueueEvents[] = [];

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(QUEUE_NAMES.IMAGE_CONVERT)
    private readonly imageQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DOCUMENT_CONVERT)
    private readonly documentQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.getOrThrow<string>('redis.host');
    const port = this.configService.getOrThrow<number>('redis.port');

    const targets: Array<{ name: string; queue: Queue }> = [
      { name: QUEUE_NAMES.IMAGE_CONVERT, queue: this.imageQueue },
      { name: QUEUE_NAMES.DOCUMENT_CONVERT, queue: this.documentQueue },
    ];

    for (const { name, queue } of targets) {
      const events = new QueueEvents(name, { connection: { host, port } });

      events.on('progress', ({ data }) => this.handleProgress(data));

      events.on('completed', ({ jobId }) => {
        void this.handleTerminal(queue, jobId, 'COMPLETED');
      });

      events.on('failed', ({ jobId, failedReason }) => {
        void this.handleTerminal(queue, jobId, 'FAILED', failedReason);
      });

      await events.waitUntilReady();
      this.queueEvents.push(events);
    }

    this.logger.log('Conversion progress event bus ready');
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.queueEvents.map((q) => q.close()));
  }

  /** Stream live events for a specific job. */
  observe(jobId: string): Observable<ConversionProgressEvent> {
    return this.subject
      .asObservable()
      .pipe(filter((event) => event.jobId === jobId));
  }

  /** Snapshot of the last event seen for a job (if still cached). */
  getLatest(jobId: string): ConversionProgressEvent | undefined {
    return this.latestByJob.get(jobId);
  }

  /**
   * Push a progress event onto the bus. Used by the HTTP service to emit the
   * immediate "QUEUED" event on enqueue, and internally to relay worker events.
   */
  publish(event: ConversionProgressEvent): void {
    this.latestByJob.set(event.jobId, event);
    this.subject.next(event);

    if (event.status === 'COMPLETED' || event.status === 'FAILED') {
      setTimeout(() => this.latestByJob.delete(event.jobId), 30_000);
    }
  }

  /** Relay a granular progress payload reported by the worker via Redis. */
  private handleProgress(data: unknown): void {
    if (!data || typeof data !== 'object') return;
    const event = data as Partial<ConversionProgressEvent>;
    if (!event.jobId || !event.status) return;

    this.publish({
      jobId: event.jobId,
      status: event.status,
      progress: event.progress ?? 0,
      phase: event.phase,
      timestamp: Date.now(),
    });
  }

  /** Relay a terminal event, resolving the queue job id to the DB job id. */
  private async handleTerminal(
    queue: Queue,
    queueJobId: string,
    status: 'COMPLETED' | 'FAILED',
    failedReason?: string,
  ): Promise<void> {
    const jobId = await this.resolveJobId(queue, queueJobId);
    this.publish({
      jobId,
      status,
      progress: status === 'COMPLETED' ? 100 : 0,
      errorMessage: failedReason,
      timestamp: Date.now(),
    });
  }

  private async resolveJobId(
    queue: Queue,
    queueJobId: string,
  ): Promise<string> {
    try {
      const job = await queue.getJob(queueJobId);
      const dbJobId = (job?.data as { jobId?: string } | undefined)?.jobId;
      if (dbJobId) return dbJobId;
    } catch (error) {
      this.logger.warn(
        `Could not resolve jobId for queue job ${queueJobId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
    return queueJobId;
  }

  /** Convert a Prisma job status to the SSE-facing status string. */
  static toSseStatus(status: ConversionJobStatus): ConversionProgressStatus {
    switch (status) {
      case ConversionJobStatus.PENDING:
      case ConversionJobStatus.QUEUED:
        return 'QUEUED';
      case ConversionJobStatus.PROCESSING:
        return 'PROCESSING';
      case ConversionJobStatus.CONVERTING:
        return 'CONVERTING';
      case ConversionJobStatus.COMPLETED:
        return 'COMPLETED';
      case ConversionJobStatus.FAILED:
        return 'FAILED';
      case ConversionJobStatus.CANCELLED:
        return 'CANCELLED';
      default:
        return 'PROCESSING';
    }
  }
}
