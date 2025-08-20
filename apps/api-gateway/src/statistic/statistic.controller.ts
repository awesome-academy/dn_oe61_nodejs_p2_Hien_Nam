import { GetStatisticByMonthRequest } from '@app/common/dto/product/requests/get-statistic-by-month.request';
import { ApiResponseGetStatisticOrderMonthlyV1 } from '@app/common/swagger/documents/statistics/statistic-order-monthly.example';
import { Controller, Get, Query } from '@nestjs/common';
import { StatisticService } from './statistic.service';

@Controller('statistics')
export class StatisticController {
  constructor(private readonly statisticService: StatisticService) {}
  @ApiResponseGetStatisticOrderMonthlyV1()
  @Get('/orders/monthly')
  async statisticOrderMonthly(@Query() query: GetStatisticByMonthRequest) {
    return this.statisticService.statisticOrderMonthly(query);
  }
}
