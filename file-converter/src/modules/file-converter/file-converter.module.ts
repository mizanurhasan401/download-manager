import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_NAMES } from '../../common/constants';
import { FileConverterController } from './file-converter.controller';
import { FileConverterService } from './file-converter.service';
import { FileJobsPersistenceModule } from './file-jobs-persistence.module';
import { ConversionProgressService } from './services/conversion-progress.service';

@Module({
  imports: [
    FileJobsPersistenceModule,
    BullModule.registerQueue(
      { name: QUEUE_NAMES.IMAGE_CONVERT },
      { name: QUEUE_NAMES.DOCUMENT_CONVERT },
    ),
  ],
  controllers: [FileConverterController],
  providers: [FileConverterService, ConversionProgressService],
  exports: [ConversionProgressService],
})
export class FileConverterModule {}
