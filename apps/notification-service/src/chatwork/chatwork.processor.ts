import { OrderCreatedPayload } from '@app/common/dto/product/payload/order-created.payload';
import { NotificationEvent } from '@app/common/enums/queue/order-event.enum';
import { QueueName } from '@app/common/enums/queue/queue-name.enum';
import { handleJobError } from '@app/common/helpers/queue.helper';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ChatworkService } from './chatwork.service';

@Processor(QueueName.CHATWORK)
export class ChatworkProcessor {
  constructor(
    private readonly chatworkService: ChatworkService,
    private readonly loggerService: CustomLogger,
  ) {}
  @Process(NotificationEvent.ORDER_CREATED)
  async handleSendMessageChatwork(job: Job<OrderCreatedPayload>) {
    try {
      await this.chatworkService.sendMessage(job.data);
    } catch (error) {
      await handleJobError(error, job, this.loggerService, '[Error send chat work message]');
    }
  }
}
