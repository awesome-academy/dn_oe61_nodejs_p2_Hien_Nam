import { OrderSummaryResponse } from '@app/common/dto/product/response/order-summary.response';
import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import {
  ApiErrorConflict,
  ApiErrorForbidden,
  ApiErrorInternal,
  ApiErrorNotFound,
  ApiErrorServiceUnavailabel,
} from '../../decorators/swagger-error.decorator';
import { SwaggerGetResponse } from '../../decorators/swagger-response.decorator';

export function ApiResponseGetHisOrdersV1() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get his orders - Required [JWT Token]',
      description: 'Get his orders',
    }),
    SwaggerGetResponse(OrderSummaryResponse, 'Get his orders successfully'),
    ApiErrorNotFound('Ordet not found', 'Order not found'),
    ApiErrorForbidden('You not have permission this resource'),
    ApiErrorConflict('Failed to get his orders', 'Failed to get his orders'),
    ApiErrorServiceUnavailabel('Service unavailbale'),
    ApiErrorInternal(),
  );
}
