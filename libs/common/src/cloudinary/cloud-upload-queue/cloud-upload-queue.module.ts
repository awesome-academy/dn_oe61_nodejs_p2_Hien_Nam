import { BullModule } from '@nestjs/bull';
import { forwardRef, Logger, Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary.module';
import { CloudUploadQueueProcessor } from './cloud-upload-queue.processor';
import { CloudUploadQueueService } from './cloud-upload-queue.service';

@Module({
  imports: [
    forwardRef(() => CloudinaryModule),
    BullModule.registerQueue({
      name: 'cloudUploadQueue',
    }),
  ],
  providers: [CloudUploadQueueService, CloudUploadQueueProcessor, Logger],
  exports: [CloudUploadQueueService],
})
export class CloudUploadQueueModule {}
