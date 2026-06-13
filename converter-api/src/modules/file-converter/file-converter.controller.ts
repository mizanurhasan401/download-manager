import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  Sse,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import {
  ConversionFileKind,
  FileConversionFile,
  FileConversionJob,
} from '@prisma/client';
import { defer, from, merge, Observable, map } from 'rxjs';
import { SkipResponseTransform } from '../../common/decorators/skip-response-transform.decorator';
import { ApiResponse as AppApiResponse } from '../../common/interfaces';
import { serializeBigInt } from '../../common/utils';
import { ConvertFileDto } from './dto/convert-file.dto';
import { FileConverterService } from './file-converter.service';
import { FileConversionJobWithFiles } from './repositories/file-conversion-job.repository';
import {
  ConversionProgressEvent,
  ConversionProgressService,
} from './services/conversion-progress.service';

interface FileConversionJobResponse {
  id: string;
  category: FileConversionJob['category'];
  sourceFormat: FileConversionJob['sourceFormat'];
  targetFormat: FileConversionJob['targetFormat'];
  status: FileConversionJob['status'];
  progress: number;
  parameters: unknown;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  files: Array<{
    id: string;
    kind: FileConversionFile['kind'];
    fileName: string;
    mimeType: string;
    sizeBytes: string;
    format: FileConversionFile['format'];
    createdAt: string;
  }>;
}

@ApiTags('FileConverter')
@Controller('file-converter')
export class FileConverterController {
  constructor(
    private readonly service: FileConverterService,
    private readonly progress: ConversionProgressService,
  ) {}

  @Post('convert')
  @ApiOperation({
    summary: 'Upload a file and start a conversion (multipart/form-data)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        targetFormat: {
          type: 'string',
          enum: ['PDF', 'DOCX', 'PNG', 'JPG', 'WEBP'],
        },
        quality: { type: 'integer', minimum: 1, maximum: 100 },
      },
      required: ['file', 'targetFormat'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async convert(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ConvertFileDto,
  ): Promise<FileConversionJobResponse> {
    const job = await this.service.createJob(file, dto);
    return this.serialize(job);
  }

  @Get()
  @ApiOperation({ summary: 'List recent conversion jobs' })
  async list(
    @Query('limit') limit?: string,
  ): Promise<FileConversionJobResponse[]> {
    const parsed = limit
      ? Math.min(Math.max(parseInt(limit, 10), 1), 100)
      : 25;
    const jobs = await this.service.listJobs(parsed);
    return jobs.map((job) => this.serialize(job));
  }

  @Get('status/:id')
  @ApiOperation({ summary: 'Polling status for a conversion job' })
  @ApiParam({ name: 'id', description: 'Conversion job UUID' })
  async status(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FileConversionJobResponse> {
    const job = await this.service.getJob(id);
    return this.serialize(job);
  }

  @Sse('progress/:id')
  @SkipResponseTransform()
  @ApiOperation({
    summary: 'Live conversion progress stream (Server-Sent Events)',
  })
  @ApiParam({ name: 'id', description: 'Conversion job UUID' })
  progressStream(
    @Param('id', ParseUUIDPipe) id: string,
  ): Observable<MessageEvent> {
    const initial$ = defer(() => from(this.service.getProgressSnapshot(id)));
    const live$ = this.progress.observe(id);

    return merge(initial$, live$).pipe(
      map(
        (event: ConversionProgressEvent): MessageEvent => ({
          data: event,
        }),
      ),
    );
  }

  @Get('file/:id')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Stream the original or converted file' })
  @ApiParam({ name: 'id', description: 'Conversion job UUID' })
  async streamFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('type') type: 'original' | 'output' = 'output',
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const kind =
      type === 'original'
        ? ConversionFileKind.ORIGINAL
        : ConversionFileKind.OUTPUT;
    const { file } = await this.service.getJobFile(id, kind);

    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': file.sizeBytes.toString(),
      'Content-Disposition': `attachment; filename="${file.fileName}"`,
      'Cache-Control': 'no-store',
    });

    const stream = this.service.getStorage().createReadStream(file.filePath);
    return new StreamableFile(stream);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a conversion job and its files' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppApiResponse> {
    await this.service.deleteJob(id);
    return { success: true, message: 'Conversion job deleted' };
  }

  private serialize(job: FileConversionJobWithFiles): FileConversionJobResponse {
    const safe = serializeBigInt(job);
    return {
      id: safe.id,
      category: safe.category,
      sourceFormat: safe.sourceFormat,
      targetFormat: safe.targetFormat,
      status: safe.status,
      progress: safe.progress,
      parameters: safe.parameters,
      errorMessage: safe.errorMessage,
      startedAt: safe.startedAt ? new Date(safe.startedAt).toISOString() : null,
      completedAt: safe.completedAt
        ? new Date(safe.completedAt).toISOString()
        : null,
      createdAt: new Date(safe.createdAt).toISOString(),
      updatedAt: new Date(safe.updatedAt).toISOString(),
      files: safe.files.map((file) => ({
        id: file.id,
        kind: file.kind,
        fileName: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: String(file.sizeBytes),
        format: file.format,
        createdAt: new Date(file.createdAt).toISOString(),
      })),
    };
  }
}
