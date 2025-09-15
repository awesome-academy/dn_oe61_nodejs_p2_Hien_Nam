import { PaymentInfoResponse } from '@app/common/dto/product/response/order-response';
import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import {
  ApiErrorBadRequestValidation,
  ApiErrorConflict,
  ApiErrorInternal,
  ApiErrorNotFound,
} from '../../decorators/swagger-error.decorator';
import { SwaggerCreatedResponse } from '../../decorators/swagger-response.decorator';

export function ApiResponseRetryPaymentV1() {
  return applyDecorators(
    ApiOperation({
      summary: 'Retry payment info - Required [JWT Token]',
      description: 'Allow User to create retry payment info',
    }),
    SwaggerCreatedResponse(
      PaymentInfoResponse,
      'Create payment info Successfully',
      'Create payment info Successfully',
    ),
    ApiErrorBadRequestValidation('Invalid input create user', [
      { orderId: 'OrderId must be not empty' },
    ]),
    ApiErrorNotFound('Order not found', 'Order not found'),
    ApiErrorConflict('Failed to retry payment info', 'Failed to retry payment info'),
    ApiErrorInternal(),
  );
}
