import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { LocalStorageService } from '../../common/services/local-storage.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly redis: Redis;

  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly storageService: LocalStorageService,
    private readonly configService: ConfigService,
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
  @ApiOperation({ summary: 'Application health check' })
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      async () => {
        try {
          await this.redis.connect();
          const pong = await this.redis.ping();
          await this.redis.disconnect();

          return {
            redis: {
              status: pong === 'PONG' ? 'up' : 'down',
            },
          };
        } catch {
          return {
            redis: { status: 'down' },
          };
        }
      },
      async () => {
        const available = await this.storageService.isStorageAvailable();
        return {
          storage: {
            status: available ? 'up' : 'down',
          },
        };
      },
    ]);
  }
}
