import { PRODUCT_SERVICE } from '@app/common';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { RetryPaymentRequest } from '@app/common/dto/product/requests/retry-payment.requqest';
import { PaymentInfoResponse } from '@app/common/dto/product/response/order-response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { callMicroservice } from '@app/common/helpers/microservices';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(PRODUCT_SERVICE) private readonly productClient: ClientProxy,
    private readonly loggerService: CustomLogger,
  ) {}
  async retryPayment(payload: RetryPaymentRequest) {
    if (!payload.userId)
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      });
    return await callMicroservice<BaseResponse<PaymentInfoResponse>>(
      this.productClient.send(ProductPattern.RETRY_PAYMENT, payload),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );
  }
}
