import { AddProductCartPayload } from '@app/common/dto/product/requests/add-product-payload';
import { CartSummaryResponse } from '@app/common/dto/product/response/cart-summary.response';
import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import {
  ApiErrorBadRequest,
  ApiErrorConflict,
  ApiErrorInternal,
  ApiErrorNotFound,
} from '../../decorators/swagger-error.decorator';
import { SwaggerCreatedArrayResponse } from '../../decorators/swagger-response.decorator';

export function ApiResponseAddCartV1() {
  return applyDecorators(
    ApiOperation({
      summary: 'User add product to cart - Required [JWT Token]',
      description: 'Allow users to add product to cart',
    }),
    ApiBody({
      description: 'Porduct info',
      type: AddProductCartPayload,
    }),
    SwaggerCreatedArrayResponse(
      CartSummaryResponse,
      'Add product to cart successfully',
      'Add product to cart successfully',
    ),
    ApiErrorNotFound('Cart not found', 'Cart not found'),
    ApiErrorBadRequest('Missing product ids', 'Product ids missing'),
    ApiErrorBadRequest('Product out stock', 'Product out stock'),
    ApiErrorConflict('Failed to add product to cart', 'Failed to add product to cart'),
    ApiErrorInternal(),
  );
}
