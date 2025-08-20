import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ChatworkProcessor } from './chatwork.processor';
import { ChatworkService } from './chatwork.service';
import { BullModule } from '@nestjs/bull';
import { QueueName } from '@app/common/enums/queue/queue-name.enum';

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: QueueName.CHATWORK,
    }),
  ],
  providers: [ChatworkService, ChatworkProcessor, CustomLogger],
  exports: [ChatworkService, BullModule],
})
export class ChatworkModule {}
