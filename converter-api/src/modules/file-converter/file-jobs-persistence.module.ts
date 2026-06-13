import { Module } from '@nestjs/common';
import { FileConversionJobRepository } from './repositories/file-conversion-job.repository';

@Module({
  providers: [FileConversionJobRepository],
  exports: [FileConversionJobRepository],
})
export class FileJobsPersistenceModule {}
