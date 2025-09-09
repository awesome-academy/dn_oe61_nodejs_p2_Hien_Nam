import { SupportedLocalesType } from '@app/common/constant/locales.constant';
import { PaymentCreationRequestDto } from '@app/common/dto/product/requests/payment-creation.request';
import { ProductEvent } from '@app/common/enums/queue/product-event.enum';
import { QueueName } from '@app/common/enums/queue/queue-name.enum';
import { addJobWithRetry } from '@app/common/helpers/queue.helper';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';

@Injectable()
export class ProductProducer {
  constructor(
    @InjectQueue(QueueName.PRODUCT)
    private readonly productQueue: Queue,
    private readonly loggerService: CustomLogger,
  ) {}
  async addJobRetryPayment(
    lang: SupportedLocalesType,
    payload: PaymentCreationRequestDto,
  ): Promise<void> {
    try {
      await addJobWithRetry(this.productQueue, ProductEvent.PAYMENT_RETRY, { lang, payload });
    } catch (error) {
      this.loggerService.error(
        `[Add job retry payment failed]`,
        `Details:: ${(error as Error).stack}`,
      );
    }
  }
}
