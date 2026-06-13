import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from '../worker.module';

async function bootstrapWorker(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  const logger = app.get(Logger);
  logger.log('Image worker started and listening for jobs');

  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down worker');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down worker');
    await app.close();
    process.exit(0);
  });
}

bootstrapWorker();
