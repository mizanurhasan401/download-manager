import { Module } from '@nestjs/common';
import { ImageJobRepository } from './repositories/image-job.repository';

@Module({
  providers: [ImageJobRepository],
  exports: [ImageJobRepository],
})
export class ImageJobsPersistenceModule {}
