import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueEvents } from 'bullmq';
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

const QUEUE_NAMES_TO_OBSERVE = [
  QUEUE_NAMES.IMAGE_CONVERT,
  QUEUE_NAMES.DOCUMENT_CONVERT,
] as const;

/**
 * Live progress bridge between BullMQ workers and SSE clients.
 *
 * The processor publishes its own granular events via `publish(...)`, which is
 * the primary signal. We also subscribe to native BullMQ `QueueEvents`
 * (`completed`, `failed`) for both queues as a safety net — guaranteeing that
 * even if a processor crashes mid-job, the SSE channel for that job still
 * resolves to a terminal state.
 *
 * Latest event per job is cached for ~30s so clients connecting after a
 * terminal state can immediately receive it before the cache expires.
 */
@Injectable()
export class ConversionProgressService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ConversionProgressService.name);
  private readonly subject = new Subject<ConversionProgressEvent>();
  private readonly latestByJob = new Map<string, ConversionProgressEvent>();
  private queueEvents: QueueEvents[] = [];

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.getOrThrow<string>('redis.host');
    const port = this.configService.getOrThrow<number>('redis.port');

    for (const name of QUEUE_NAMES_TO_OBSERVE) {
      const events = new QueueEvents(name, { connection: { host, port } });

      events.on('completed', ({ jobId }) => {
        this.publish({
          jobId,
          status: 'COMPLETED',
          progress: 100,
          timestamp: Date.now(),
        });
      });

      events.on('failed', ({ jobId, failedReason }) => {
        this.publish({
          jobId,
          status: 'FAILED',
          progress: 0,
          errorMessage: failedReason,
          timestamp: Date.now(),
        });
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
   * Push a progress event onto the bus.
   * Called by processors after every status transition so SSE clients see
   * coarse-grained transitions in addition to numeric progress.
   */
  publish(event: ConversionProgressEvent): void {
    this.latestByJob.set(event.jobId, event);
    this.subject.next(event);

    if (event.status === 'COMPLETED' || event.status === 'FAILED') {
      // Evict cached terminal events shortly after — long-poll clients still
      // get them via the DB record, while keeping memory bounded.
      setTimeout(() => this.latestByJob.delete(event.jobId), 30_000);
    }
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
