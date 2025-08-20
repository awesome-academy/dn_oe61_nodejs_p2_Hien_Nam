import { OrderResponse } from '@app/common/dto/product/response/order-response';
import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import {
  ApiErrorConflict,
  ApiErrorInternal,
  ApiErrorNotFound,
  ApiErrorServiceUnavailabel,
} from '../../decorators/swagger-error.decorator';
import {
  SwaggerNoContentResponse,
  SwaggerUpdatedResponse,
} from '../../decorators/swagger-response.decorator';

export function ApiResponseConfirmOrderV1() {
  return applyDecorators(
    ApiOperation({
      summary: 'Confirm order - Required [JWT Token]',
      description: 'Allow admin to confirm a order',
    }),
    SwaggerUpdatedResponse(
      OrderResponse,
      'Confirm order successfully',
      'Confirm order successfully',
    ),
    SwaggerNoContentResponse('No change'),
    ApiErrorNotFound('Order not found', 'Order not found'),
    ApiErrorConflict('Failed to confirm order', 'Failed to confirm order'),
    ApiErrorServiceUnavailabel('Service unavailbale'),
    ApiErrorInternal(),
  );
}
