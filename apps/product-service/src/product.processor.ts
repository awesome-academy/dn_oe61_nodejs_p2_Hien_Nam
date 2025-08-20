import { SupportedLocalesType } from '@app/common/constant/locales.constant';
import { DeleteSoftCartRequest } from '@app/common/dto/product/requests/delete-soft-cart.request';
import { PaymentCreationRequestDto } from '@app/common/dto/product/requests/payment-creation.request';
import { PaymentInfoResponse } from '@app/common/dto/product/response/order-response';
import { ProductEvent } from '@app/common/enums/queue/product-event.enum';
import { QueueName } from '@app/common/enums/queue/queue-name.enum';
import { handleJobError } from '@app/common/helpers/queue.helper';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { getRemainingTime } from '@app/common/utils/date.util';
import { Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { I18nService } from 'nestjs-i18n';
import { ProductService } from './product-service.service';

@Processor({ name: QueueName.PRODUCT })
@Injectable()
export class ProductProcessor {
  constructor(
    private readonly productService: ProductService,
    private readonly loggerService: CustomLogger,
    private readonly i18nService: I18nService,
  ) {}
  @Process(ProductEvent.SOFT_DELETE_CART)
  async handleSoftDeleteCart(job: Job<DeleteSoftCartRequest>) {
    try {
      await this.productService.deleteSoftCart(job.data);
    } catch (error) {
      await handleJobError(error, job, this.loggerService, '[Error delete soft cart]');
    }
  }
  @Process(ProductEvent.PAYMENT_RETRY)
  async handlePaymentRetry(
    job: Job<{ lang: SupportedLocalesType; payload: PaymentCreationRequestDto }>,
  ) {
    try {
      const paymentData = await this.productService.createPaymentInfo(job.data.payload);
      const paymentInfo: PaymentInfoResponse = {
        qrCodeUrl: paymentData.data.checkoutUrl,
        expiredAt: getRemainingTime(job.data.payload.expiredAt, job.data.lang, this.i18nService),
      };
      // Có thể gửi lại thông tin sau khi retry lại payment info thông qua Websocket
      const orderUpdated = await this.productService.updateOrderPaymentInfo({
        orderId: job.data.payload.orderId,
        ...paymentInfo,
      });
      this.loggerService.log(
        `Update order payment info successfully: ${JSON.stringify(orderUpdated)}`,
      );
    } catch (error) {
      await handleJobError(error, job, this.loggerService, '[Error payment retry]');
    }
  }
  @Process(ProductEvent.EXPIRED_PAYMENT_ORDER)
  async handleExpiredPaymentOrder(job: Job<{ orderId: number }>) {
    if (!job.data.orderId) {
      this.loggerService.error(`[Handle Expired Payment Order Failed by Underfield Order]`);
      return;
    }
    try {
      this.loggerService.log(`[HANDLE CANCEL ORDER ${job.data.orderId}] by expired payment`);
      await this.productService.handleExpirePaymentOrder(job.data.orderId);
    } catch (error) {
      await handleJobError(error, job, this.loggerService, '[Error expired payment order]');
    }
  }
}
