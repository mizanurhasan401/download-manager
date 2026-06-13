import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(private readonly configService: ConfigService) {}

  @Get('info')
  @ApiOperation({ summary: 'Get system information' })
  getInfo() {
    return {
      success: true,
      message: 'System information retrieved',
      data: {
        name: 'Video Downloader API',
        version: '1.0.0',
        environment: this.configService.get<string>('app.nodeEnv'),
        supportedProviders: [
          'youtube.com',
          'youtu.be',
          'facebook.com',
          'instagram.com',
          'tiktok.com',
          'vimeo.com',
        ],
      },
    };
  }
}
