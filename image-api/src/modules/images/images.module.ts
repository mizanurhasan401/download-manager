import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../common/constants';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { ImageJobsPersistenceModule } from './image-jobs-persistence.module';

@Module({
  imports: [
    ImageJobsPersistenceModule,
    BullModule.registerQueue(
      { name: QUEUE_NAMES.IMAGE_FAST_OPS },
      { name: QUEUE_NAMES.IMAGE_BG_REMOVE },
    ),
  ],
  controllers: [ImagesController],
  providers: [ImagesService],
})
export class ImagesModule {}
