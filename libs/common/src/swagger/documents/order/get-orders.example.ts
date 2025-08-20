import { OrderResponse } from '@app/common/dto/product/response/order-response';
import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import {
  ApiErrorConflict,
  ApiErrorInternal,
  ApiErrorServiceUnavailabel,
} from '../../decorators/swagger-error.decorator';
import { SwaggerGetPaginatedResponse } from '../../decorators/swagger-response.decorator';

export function ApiResponseGetOrdersV1() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get orders - Required [JWT Token]',
      description: 'Get paginated list of orders',
    }),
    SwaggerGetPaginatedResponse(
      OrderResponse,
      'Get orders successfully',
      'Get orders successfully',
    ),
    ApiErrorConflict('Failed to get orders', 'Failed to get orders'),
    ApiErrorServiceUnavailabel('Service unavailable'),
    ApiErrorInternal(),
  );
}
