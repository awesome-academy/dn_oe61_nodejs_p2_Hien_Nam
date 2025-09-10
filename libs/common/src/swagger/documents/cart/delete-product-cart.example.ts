import { DeleteProductCartPayload } from '@app/common/dto/product/requests/delete-product-cart-payload';
import { CartSummaryResponse } from '@app/common/dto/product/response/cart-summary.response';
import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import {
  ApiErrorBadRequest,
  ApiErrorConflict,
  ApiErrorInternal,
  ApiErrorNotFound,
} from '../../decorators/swagger-error.decorator';
import { SwaggerUpdatedArrayResponse } from '../../decorators/swagger-response.decorator';

export function ApiResponseRemoveProductCartV1() {
  return applyDecorators(
    ApiOperation({
      summary: 'User remove product to cart - Required [JWT Token]',
      description: 'Allow users to remove product to cart',
    }),
    ApiBody({
      description: 'Porduct info',
      type: DeleteProductCartPayload,
    }),
    SwaggerUpdatedArrayResponse(
      CartSummaryResponse,
      'Remove product cart successfully',
      'Remove product cart successfully',
    ),
    ApiErrorNotFound('Cart not found', 'Cart not found'),
    ApiErrorBadRequest('Missing product ids', 'Product ids missing ids [1,2]'),
    ApiErrorBadRequest('Product out stock', 'Product out stock ids [1,2]'),
    ApiErrorConflict('Failed to add product to cart', 'Failed to add product to cart'),
    ApiErrorInternal(),
  );
}
