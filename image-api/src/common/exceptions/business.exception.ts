import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
  }
}

export class ImageJobNotFoundException extends BusinessException {
  constructor(message = 'Image job not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class ImageJobNotReadyException extends BusinessException {
  constructor(message = 'Image job is not ready') {
    super(message, HttpStatus.CONFLICT);
  }
}

export class UnsupportedImageFormatException extends BusinessException {
  constructor(message = 'Unsupported image format') {
    super(message, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
  }
}

export class ImageTooLargeException extends BusinessException {
  constructor(message = 'Image file is too large') {
    super(message, HttpStatus.PAYLOAD_TOO_LARGE);
  }
}

export class ImageProcessingException extends BusinessException {
  constructor(message = 'Image processing failed') {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class StorageException extends BusinessException {
  constructor(message = 'Storage operation failed') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
