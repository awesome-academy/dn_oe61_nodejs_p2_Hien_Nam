import { RejectOrderResponse } from '@app/common/dto/product/response/reject-order.response';
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

export function ApiResponseRejectOrderV1() {
  return applyDecorators(
    ApiOperation({
      summary: 'Reject order - Required [JWT Token]',
      description: 'Allow admin to reject a order',
    }),
    SwaggerUpdatedResponse(
      RejectOrderResponse,
      'Reject order successfully',
      'Reject order successfully',
    ),
    SwaggerNoContentResponse('No change'),
    ApiErrorNotFound('Order not found', 'Order not found'),
    ApiErrorConflict('Failed to Reject order', 'Failed to Reject order'),
    ApiErrorServiceUnavailabel('Service unavailbale'),
    ApiErrorInternal(),
  );
}
