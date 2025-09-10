import { PRODUCT_SERVICE } from '@app/common';

import { BaseCacheService } from '@app/common/cache/base-cache.service';
import { CacheService } from '@app/common/cache/cache.service';
import { ORDER_CACHE_PREFIX } from '@app/common/constant/cache-prefix.constant copy';
import { DEFAULT_CACHE_TTL_1H, TTL_CACHE_GET_ORDERS_2m } from '@app/common/constant/cache.constant';
import { DETAIL_CACHE, GET_ALL_CACHE } from '@app/common/constant/end-prefix-cache.constant';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { ConfirmOrderRequest } from '@app/common/dto/product/requests/confirm-order.request';
import { FilterGetOrdersRequest } from '@app/common/dto/product/requests/filter-get-orders.request';
import { GetOrderRequest } from '@app/common/dto/product/requests/get-order.request';
import { OrderRequest } from '@app/common/dto/product/requests/order-request';
import { RejectOrderRequest } from '@app/common/dto/product/requests/reject-order.request';
import { OrderResponse } from '@app/common/dto/product/response/order-response';
import { OrderSummaryResponse } from '@app/common/dto/product/response/order-summary.response';
import { RejectOrderResponse } from '@app/common/dto/product/response/reject-order.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';

import { buildKeyCache } from '@app/common/helpers/cache.helper';
import { callMicroservice } from '@app/common/helpers/microservices';
import { toQueryParam } from '@app/common/helpers/query.helper';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { PaginationResult } from '@app/common/interfaces/pagination';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrderService {
  constructor(
    @Inject(PRODUCT_SERVICE) private readonly productClient: ClientProxy,
    private readonly loggerService: CustomLogger,
    private readonly cacheService: CacheService,
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

  async getOrder(payload: GetOrderRequest) {
    if (!payload.userId || !payload.role)
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      });
    const cacheKey = this.genCacheKey(
      buildKeyCache(ORDER_CACHE_PREFIX, { orderId: payload.orderId }, DETAIL_CACHE),
      this.cacheService,
    );
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const microserviceResult = await callMicroservice<BaseResponse<OrderSummaryResponse>>(
          this.productClient.send(ProductPattern.GET_ORDER, payload),
          PRODUCT_SERVICE,
          this.loggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );
        if (!microserviceResult) {
          throw new TypedRpcException({
            code: HTTP_ERROR_CODE.NOT_FOUND,
            message: 'common.order.notFound',
          });
        }
        return microserviceResult;
      },
      {
        ttl: DEFAULT_CACHE_TTL_1H,
      },
    );
  }
  async getOrders(
    filter: FilterGetOrdersRequest,
  ): Promise<BaseResponse<PaginationResult<OrderResponse>>> {
    const options = this.thisBuildOptionCacheUsers(filter);
    const cacheKey = this.genCacheKey(
      buildKeyCache(ORDER_CACHE_PREFIX, undefined, GET_ALL_CACHE),
      this.cacheService,
      options,
    );
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const microserviceResult = await callMicroservice<
          BaseResponse<PaginationResult<OrderResponse>>
        >(
          this.productClient.send(ProductPattern.GET_ORDERS, filter),
          PRODUCT_SERVICE,
          this.loggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );
        return microserviceResult;
      },
      {
        ttl: TTL_CACHE_GET_ORDERS_2m,
      },
    );
  }
  private genCacheKey(
    key: string,
    typeCacheService: BaseCacheService,
    options?: Record<string, undefined | string | number | boolean>,
  ): string {
    const cacheKey = typeCacheService.generateKey(key, options);
    return cacheKey;
  }
  private thisBuildOptionCacheUsers(filter: FilterGetOrdersRequest) {
    return {
      page: filter.page,
      pageSize: filter.pageSize,
      ...toQueryParam(filter.statuses, 'statuses'),
      ...toQueryParam(filter.methods, 'methods'),
      ...toQueryParam(filter.paymentStatuses, 'paymentStatuses'),
      ...(filter.sortBy && { sortBy: filter.sortBy }),
      direction: filter.direction,
    };
  }
}
