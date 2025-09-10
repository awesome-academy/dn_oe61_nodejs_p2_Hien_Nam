import { SupportedLocalesType } from '@app/common/constant/locales.constant';
import { REMINDER_BEFORE_EXPIRED_DEFAULT } from '@app/common/constant/time.constant';
import { PaymentCreationRequestDto } from '@app/common/dto/product/requests/payment-creation.request';
import { ProductEvent } from '@app/common/enums/queue/product-event.enum';
import { QueueName } from '@app/common/enums/queue/queue-name.enum';
import { addJobWithRetry } from '@app/common/helpers/queue.helper';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';

@Injectable()
export class ProductProducer {
  constructor(
    @InjectQueue(QueueName.PRODUCT)
    private readonly productQueue: Queue,
    private readonly loggerService: CustomLogger,
    private readonly configService: ConfigService,
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
  async addJobHandleExpiredPaymentOrder(orderId: number, expiredAt: number) {
    try {
      this.loggerService.log(`Add job handle expired payment orderId ${orderId}`);
      const now = Date.now();
      const reminderBeforeExpire = this.configService.get<string>(
        'payOS.reminderBeforeExpire',
        REMINDER_BEFORE_EXPIRED_DEFAULT,
      );
      this.loggerService.debug(`[Reminder ms:: ] ${reminderBeforeExpire}`);
      const expiredId = `expired-${orderId}`;
      const nowSec = Math.floor(now / 1000);
      const delayExpired = (expiredAt - nowSec) * 1000;
      if (delayExpired > 0) {
        await this.productQueue.add(
          ProductEvent.EXPIRED_PAYMENT_ORDER,
          { orderId },
          { delay: delayExpired, jobId: expiredId },
        );
      }
    } catch (error) {
      this.loggerService.error(
        `[ADD JOB handle expired payment order failed]`,
        `Details:: ${(error as Error).stack}`,
      );
    }
  }
  async clearScheduleHandleExpiredPayment(orderId: number) {
    this.loggerService.log(`[Clear job handle expired payment (${orderId})]`);
    await this.productQueue.removeJobs(`expired-${orderId}`);
  }
}
