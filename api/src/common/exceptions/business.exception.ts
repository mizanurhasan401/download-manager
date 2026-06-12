import { HttpException, HttpStatus } from '@nestjs/common';
import type { YtDlpErrorCode } from '../utils/ytdlp-error.util';

export class BusinessException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
  }
}

export class ProviderNotAllowedException extends BusinessException {
  constructor(message = 'Video provider is not allowed') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class DownloadNotFoundException extends BusinessException {
  constructor(message = 'Download job not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class DownloadNotReadyException extends BusinessException {
  constructor(message = 'Download is not ready yet') {
    super(message, HttpStatus.CONFLICT);
  }
}

export class YtDlpExecutionException extends BusinessException {
  readonly errorCode?: YtDlpErrorCode;

  constructor(
    message = 'Failed to extract video metadata',
    errorCode?: YtDlpErrorCode,
  ) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY);
    this.errorCode = errorCode;
  }
}

export class DownloaderNotAvailableException extends BusinessException {
  constructor(tool: string, configuredPath: string) {
    super(
      `${tool} is not installed or not found at "${configuredPath}". Install it on the host or set ${tool === 'yt-dlp' ? 'YTDLP_PATH' : 'FFMPEG_PATH'} in .env.development`,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class StorageException extends BusinessException {
  constructor(message = 'Storage operation failed') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
