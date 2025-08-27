import { BullModule } from '@nestjs/bull';
import { Logger, Module } from '@nestjs/common';
import { MailQueueProcessor } from './mail-queue.processor';
import { MailQueueService } from './mail-queue.service';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
    MailerModule,
  ],
  providers: [MailQueueService, MailQueueProcessor, Logger],
  exports: [MailQueueService],
})
export class MailQueueModule {}
