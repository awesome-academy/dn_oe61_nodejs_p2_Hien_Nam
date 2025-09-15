import { PRODUCT_SERVICE } from '@app/common';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { GetStatisticByMonthRequest } from '@app/common/dto/product/requests/get-statistic-by-month.request';
import { StatisticOrderByMonthResponse } from '@app/common/dto/product/response/statistic-order-by-month.response';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { callMicroservice } from '@app/common/helpers/microservices';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
@Injectable()
export class StatisticService {
  constructor(
    @Inject(PRODUCT_SERVICE) private readonly productClient: ClientProxy,
    private readonly loggerService: CustomLogger,
  ) {}
  async statisticOrderMonthly(dto: GetStatisticByMonthRequest) {
    return await callMicroservice<StatisticOrderByMonthResponse>(
      this.productClient.send(ProductPattern.GET_STATISTIC_BY_MONTH, dto),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );
  }
}
