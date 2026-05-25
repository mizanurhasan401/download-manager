import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import type { Request } from 'express';
import { Observable, defer, from, merge, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { FetchMetadataDto } from './dto/fetch-metadata.dto';
import { StartDownloadDto } from './dto/start-download.dto';
import { DownloadsService } from './downloads.service';
import { VideosService } from '../videos/videos.service';
import { VideoUrlValidationPipe } from '../../common/pipes/video-url-validation.pipe';
import { SkipResponseTransform } from '../../common/decorators/skip-response-transform.decorator';
import {
  DownloadProgressEvent,
  DownloadProgressService,
} from './services/download-progress.service';

@ApiTags('Downloads')
@Controller('downloads')
export class DownloadsController {
  constructor(
    private readonly downloadsService: DownloadsService,
    private readonly videosService: VideosService,
    private readonly progressService: DownloadProgressService,
  ) {}

  @Post('metadata')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extract video metadata and available formats' })
  @ApiResponse({ status: 200, description: 'Metadata extracted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid URL or provider not allowed' })
  @ApiResponse({ status: 422, description: 'Failed to extract metadata' })
  async fetchMetadata(@Body() dto: FetchMetadataDto) {
    const url = new VideoUrlValidationPipe().transform(dto.url);
    const metadata = await this.videosService.extractAndStoreMetadata(url);

    return {
      success: true,
      message: 'Metadata extracted successfully',
      data: metadata,
    };
  }

  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Start a download job' })
  @ApiResponse({ status: 202, description: 'Download job queued' })
  async startDownload(@Body() dto: StartDownloadDto) {
    const result = await this.downloadsService.startDownload(dto);

    return {
      success: true,
      message: 'Download job queued successfully',
      data: result,
    };
  }

  @Get('status/:id')
  @ApiOperation({ summary: 'Get download job status' })
  @ApiParam({ name: 'id', description: 'Download job UUID' })
  @ApiResponse({ status: 200, description: 'Status retrieved' })
  @ApiResponse({ status: 404, description: 'Download job not found' })
  async getStatus(@Param('id', ParseUUIDPipe) id: string) {
    const status = await this.downloadsService.getStatus(id);

    return {
      success: true,
      message: 'Download status retrieved',
      data: status,
    };
  }

  @Sse('progress/:id')
  @SkipResponseTransform()
  @ApiOperation({
    summary: 'Live download progress stream (Server-Sent Events)',
  })
  @ApiParam({ name: 'id', description: 'Download job UUID' })
  progressStream(
    @Param('id', ParseUUIDPipe) id: string,
  ): Observable<MessageEvent> {
    const initial$ = defer(() =>
      from(this.downloadsService.getProgressSnapshot(id)),
    );

    const live$ = this.progressService.observe(id);

    return merge(initial$, live$).pipe(
      map((event: DownloadProgressEvent) => ({
        data: event,
      })),
    );
  }

  @Get('file/:id')
  @ApiOperation({ summary: 'Download completed file' })
  @ApiParam({ name: 'id', description: 'Download job UUID' })
  @ApiResponse({ status: 200, description: 'File stream' })
  @ApiResponse({ status: 404, description: 'Download job not found' })
  @ApiResponse({ status: 409, description: 'Download not ready' })
  async downloadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.downloadsService.streamFile(id, response, request);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel or delete a download job' })
  @ApiParam({ name: 'id', description: 'Download job UUID' })
  @ApiResponse({ status: 200, description: 'Download cancelled' })
  async cancelDownload(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.downloadsService.cancelDownload(id);

    return {
      success: true,
      message: result.message,
      data: result,
    };
  }
}
