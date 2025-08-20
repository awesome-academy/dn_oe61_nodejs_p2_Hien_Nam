import { CartSummaryResponse } from '@app/common/dto/product/response/cart-summary.response';
import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ApiErrorConflict, ApiErrorInternal } from '../../decorators/swagger-error.decorator';
import { SwaggerGetResponse } from '../../decorators/swagger-response.decorator';

export function ApiResponseGetCartV1() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get his cart - Required [JWT Token]',
      description: 'Get his cart',
    }),
    SwaggerGetResponse(CartSummaryResponse, 'Get cart successfully', 'Get cart successfully'),
    ApiErrorConflict('Failed to get cart', 'Failed to get cart'),
    ApiErrorInternal(),
  );
}
