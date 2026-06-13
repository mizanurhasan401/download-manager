import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
  }
}

export class FileConversionJobNotFoundException extends BusinessException {
  constructor(message = 'Conversion job not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class FileConversionJobNotReadyException extends BusinessException {
  constructor(message = 'Conversion job is not ready') {
    super(message, HttpStatus.CONFLICT);
  }
}

export class UnsupportedFileFormatException extends BusinessException {
  constructor(message = 'Unsupported file format') {
    super(message, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
  }
}

export class UnsupportedConversionException extends BusinessException {
  constructor(message = 'Conversion pair is not supported') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class FileTooLargeException extends BusinessException {
  constructor(message = 'Uploaded file is too large') {
    super(message, HttpStatus.PAYLOAD_TOO_LARGE);
  }
}

export class FileConversionException extends BusinessException {
  constructor(message = 'File conversion failed') {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class StorageException extends BusinessException {
  constructor(message = 'Storage operation failed') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
