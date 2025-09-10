import { OrderPayload } from '@app/common/dto/product/requests/order-payload.request';
import { OrderResponse } from '@app/common/dto/product/response/order-response';
import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import {
  ApiErrorBadRequest,
  ApiErrorBadRequestValidation,
  ApiErrorConflict,
  ApiErrorInternal,
  ApiErrorNotFound,
  ApiErrorServiceUnavailabel,
} from '../../decorators/swagger-error.decorator';
import { SwaggerCreatedResponse } from '../../decorators/swagger-response.decorator';

export function ApiResponseCreateOrderV1() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create order - Required [JWT Token]',
      description: 'Allow users to create a order',
    }),
    ApiBody({
      description: 'Order Creation Info',
      type: OrderPayload,
    }),
    SwaggerCreatedResponse(OrderResponse, 'Order created sucessfully', 'Order created sucessfully'),
    ApiErrorBadRequestValidation('Invalid input create Order', [
      { quantity: 'Quantity product not must be least 1' },
      { productVariantId: 'productVariantId must be not empty' },
    ]),
    ApiErrorBadRequest('Some product out stock', 'Some product out stock ids: [1,2]'),
    ApiErrorNotFound('Some product not found', 'Some product not exist ids: [1,2]'),
    ApiErrorConflict('Failed to create order', 'Failed to create order'),
    ApiErrorServiceUnavailabel('Service unavailable'),
    ApiErrorInternal(),
  );
}
