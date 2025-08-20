import { PRODUCT_SERVICE } from '@app/common';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { ConfirmOrderRequest } from '@app/common/dto/product/requests/confirm-order.request';
import { OrderRequest } from '@app/common/dto/product/requests/order-request';
import { RejectOrderRequest } from '@app/common/dto/product/requests/reject-order.request';
import { OrderResponse } from '@app/common/dto/product/response/order-response';
import { RejectOrderResponse } from '@app/common/dto/product/response/reject-order.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { callMicroservice } from '@app/common/helpers/microservices';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrderService {
  constructor(
    @Inject(PRODUCT_SERVICE) private readonly productClient: ClientProxy,
    private readonly loggerService: CustomLogger,
  ) {}
  async createOrder(payload: OrderRequest) {
    if (!payload.userId)
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      });
    return await callMicroservice<BaseResponse<OrderResponse>>(
      this.productClient.send(ProductPattern.CREATE_ORDER, payload),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );
  }
  async rejectOrder(payload: RejectOrderRequest) {
    if (!payload.userId)
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      });
    return await firstValueFrom<BaseResponse<RejectOrderResponse>>(
      this.productClient.send(ProductPattern.REJECT_ORDER, payload),
    );
  }
  async confirmOrder(payload: ConfirmOrderRequest) {
    if (!payload.userId)
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      });
    return await callMicroservice<BaseResponse<OrderResponse>>(
      this.productClient.send(ProductPattern.CONFIRM_ORDER, payload),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );
  }
}
