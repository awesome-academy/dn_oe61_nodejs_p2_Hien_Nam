import { QueueName } from '@app/common/enums/queue/queue-name.enum';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MailQueueProcessor } from './mail-queue.processor';
import { MailQueueService } from './mail-queue.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueName.EMAIL,
    }),
    MailerModule,
  ],
  providers: [MailQueueService, MailQueueProcessor, CustomLogger],
  exports: [MailQueueService, BullModule],
})
export class MailQueueModule {}
