import { Global, Module } from '@nestjs/common';
import { SharpService } from './sharp.service';
import { BackgroundRemovalService } from './background-removal.service';

@Global()
@Module({
  providers: [SharpService, BackgroundRemovalService],
  exports: [SharpService, BackgroundRemovalService],
})
export class ProcessingModule {}
