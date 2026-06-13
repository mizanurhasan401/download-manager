import { Module } from '@nestjs/common';
import { DownloadRepository } from './repositories/download.repository';

@Module({
  providers: [DownloadRepository],
  exports: [DownloadRepository],
})
export class DownloadPersistenceModule {}
