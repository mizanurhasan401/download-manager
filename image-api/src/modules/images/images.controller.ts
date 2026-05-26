import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ImageFile, ImageFileKind, ImageJob } from '@prisma/client';
import { SkipResponseTransform } from '../../common/decorators/skip-response-transform.decorator';
import { ApiResponse as AppApiResponse } from '../../common/interfaces';
import { serializeBigInt } from '../../common/utils';
import { ImageJobWithFiles } from './repositories/image-job.repository';
import { CreateImageJobDto } from './dto/create-image-job.dto';
import { ImagesService } from './images.service';

interface ImageJobResponse {
  id: string;
  operation: ImageJob['operation'];
  status: ImageJob['status'];
  progress: number;
  parameters: unknown;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  files: Array<{
    id: string;
    kind: ImageFile['kind'];
    fileName: string;
    mimeType: string;
    sizeBytes: string;
    width: number | null;
    height: number | null;
    format: ImageFile['format'];
    hasAlpha: boolean;
    createdAt: string;
  }>;
}

@ApiTags('Images')
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('jobs')
  @ApiOperation({ summary: 'Create a new image processing job (multipart upload)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        operation: { type: 'string', enum: ['CONVERT', 'RESIZE', 'REMOVE_BACKGROUND'] },
        format: { type: 'string', enum: ['jpeg', 'png', 'webp', 'avif'] },
        quality: { type: 'integer', minimum: 1, maximum: 100 },
        width: { type: 'integer', minimum: 1, maximum: 8192 },
        height: { type: 'integer', minimum: 1, maximum: 8192 },
        fit: { type: 'string', enum: ['cover', 'contain', 'fill', 'inside', 'outside'] },
      },
      required: ['file', 'operation'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async createJob(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateImageJobDto,
  ): Promise<ImageJobResponse> {
    const job = await this.imagesService.createJob(file, dto);
    return this.serialize(job);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List recent image jobs' })
  async listJobs(@Query('limit') limit?: string): Promise<ImageJobResponse[]> {
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10), 1), 100) : 25;
    const jobs = await this.imagesService.listJobs(parsedLimit);
    return jobs.map((job) => this.serialize(job));
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get image job status and metadata' })
  async getJob(@Param('id', ParseUUIDPipe) id: string): Promise<ImageJobResponse> {
    const job = await this.imagesService.getJob(id);
    return this.serialize(job);
  }

  @Delete('jobs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an image job and its files' })
  async deleteJob(@Param('id', ParseUUIDPipe) id: string): Promise<AppApiResponse> {
    await this.imagesService.deleteJob(id);
    return { success: true, message: 'Image job deleted' };
  }

  @Get('jobs/:id/file')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Stream the original or processed file' })
  async streamFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('type') type: 'original' | 'output' = 'output',
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const kind = type === 'original' ? ImageFileKind.ORIGINAL : ImageFileKind.OUTPUT;
    const { file } = await this.imagesService.getJobFile(id, kind);

    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': file.sizeBytes.toString(),
      'Content-Disposition': `attachment; filename="${file.fileName}"`,
      'Cache-Control': 'no-store',
    });

    const stream = this.imagesService.getStorage().createReadStream(file.filePath);
    return new StreamableFile(stream);
  }

  private serialize(job: ImageJobWithFiles): ImageJobResponse {
    const safe = serializeBigInt(job);
    return {
      id: safe.id,
      operation: safe.operation,
      status: safe.status,
      progress: safe.progress,
      parameters: safe.parameters,
      errorMessage: safe.errorMessage,
      startedAt: safe.startedAt ? new Date(safe.startedAt).toISOString() : null,
      completedAt: safe.completedAt ? new Date(safe.completedAt).toISOString() : null,
      createdAt: new Date(safe.createdAt).toISOString(),
      updatedAt: new Date(safe.updatedAt).toISOString(),
      files: safe.files.map((file) => ({
        id: file.id,
        kind: file.kind,
        fileName: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: String(file.sizeBytes),
        width: file.width ?? null,
        height: file.height ?? null,
        format: file.format,
        hasAlpha: file.hasAlpha,
        createdAt: new Date(file.createdAt).toISOString(),
      })),
    };
  }
}
