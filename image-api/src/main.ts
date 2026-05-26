import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { API_PREFIX } from './common/constants';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('app.port');
  const host = configService.getOrThrow<string>('app.host');
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const baseUrl = configService.getOrThrow<string>('app.baseUrl');

  app.useLogger(app.get(Logger));
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.enableCors({
    origin: nodeEnv === 'production' ? false : true,
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type'],
  });

  app.setGlobalPrefix(API_PREFIX);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Image Processing API')
    .setDescription('Microservice for image conversion, resizing, and background removal')
    .setVersion('0.1.0')
    .addTag('Images', 'Image processing operations')
    .addTag('Health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha', operationsSorter: 'alpha' },
  });

  await app.listen(port, host);

  const logger = app.get(Logger);
  logger.log(`Image API running at ${baseUrl}`);
  logger.log(`Swagger docs at ${baseUrl}/docs`);
  logger.log(`API base URL: ${baseUrl}/${API_PREFIX}`);
}

bootstrap();
