import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { promises as fs } from 'fs';
import Redis from 'ioredis';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { LibreOfficeService } from '../processing/libreoffice.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly redis: Redis;

  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly libreOffice: LibreOfficeService,
  ) {
    this.redis = new Redis({
      host: this.configService.getOrThrow<string>('redis.host'),
      port: this.configService.getOrThrow<number>('redis.port'),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'File-converter health check' })
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      async () => {
        try {
          await this.redis.connect();
          const pong = await this.redis.ping();
          await this.redis.disconnect();
          return {
            redis: { status: pong === 'PONG' ? 'up' : 'down' },
          };
        } catch {
          return { redis: { status: 'down' } };
        }
      },
      async () => {
        const storagePath = path.resolve(
          this.configService.get<string>('storage.path', './storage'),
        );
        try {
          await fs.access(storagePath);
          return { storage: { status: 'up' } };
        } catch {
          return { storage: { status: 'down' } };
        }
      },
      async () => ({
        libreoffice: {
          status: this.libreOffice.isAvailable() ? 'up' : 'down',
        },
      }),
    ]);
  }
}
