import { StatisticOrderByMonthResponse } from '@app/common/dto/product/response/statistic-order-by-month.response';
import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import {
  ApiErrorConflict,
  ApiErrorInternal,
  ApiErrorServiceUnavailabel,
} from '../../decorators/swagger-error.decorator';
import { SwaggerGetResponse } from '../../decorators/swagger-response.decorator';

export function ApiResponseGetStatisticOrderMonthlyV1() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get statistic order monthly - Required [JWT Token]',
      description: 'Get statistic order',
    }),
    SwaggerGetResponse(StatisticOrderByMonthResponse, 'Get statistic order successfully'),
    ApiErrorConflict('Failed to get Get statistic order', 'Failed to get Get statistic order'),
    ApiErrorServiceUnavailabel('Service unavailbale'),
    ApiErrorInternal(),
  );
}
