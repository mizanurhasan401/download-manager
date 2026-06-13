import { Global, Module } from '@nestjs/common';
import { LocalStorageService } from '../../common/services/local-storage.service';
import { FfmpegService } from '../../common/services/ffmpeg.service';
import { STORAGE_SERVICE } from '../../common/interfaces/storage.interface';

@Global()
@Module({
  providers: [
    LocalStorageService,
    FfmpegService,
    {
      provide: STORAGE_SERVICE,
      useExisting: LocalStorageService,
    },
  ],
  exports: [LocalStorageService, FfmpegService, STORAGE_SERVICE],
})
export class StorageModule {}
