import { CurrentUser } from '@app/common';
import { AddProductCartRequest } from '@app/common/dto/product/requests/add-product-cart.request';
import { AddProductCartPayload } from '@app/common/dto/product/requests/add-product-payload';
import { DeleteProductCartPayload } from '@app/common/dto/product/requests/delete-product-cart-payload';
import { DeleteProductCartRequest } from '@app/common/dto/product/requests/delete-product-cart.request';
import { AccessTokenPayload } from '@app/common/interfaces/token-payload';
import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { CartService } from './cart.service';
import { GetCartRequest } from '@app/common/dto/product/requests/get-cart.request';
import { ApiResponseAddCartV1 } from '@app/common/swagger/documents/cart/add-cart.example';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseRemoveProductCartV1 } from '@app/common/swagger/documents/cart/delete-product-cart.example';
import { ApiResponseGetCartV1 } from '@app/common/swagger/documents/cart/get-cart.example';

@Controller('carts')
export class CartController {
  constructor(private readonly cartService: CartService) {}
  @ApiBearerAuth('access-token')
  @ApiResponseAddCartV1()
  @Post('items')
  async addProductCart(
    @CurrentUser() user: AccessTokenPayload,
    @Body() payload: AddProductCartPayload,
  ) {
    const dto: AddProductCartRequest = {
      userId: user.id,
      ...payload,
    };
    return this.cartService.addProductCart(dto);
  }
  @ApiBearerAuth('access-token')
  @ApiResponseRemoveProductCartV1()
  @Delete('/items')
  async deleteProductCart(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: DeleteProductCartPayload,
  ) {
    const payload: DeleteProductCartRequest = {
      userId: user.id,
      productVariantIds: dto.productVariantIds,
    };
    return this.cartService.deleteProductCart(payload);
  }
  @ApiBearerAuth('access-token')
  @ApiResponseGetCartV1()
  @Get('')
  async getCart(@CurrentUser() user: AccessTokenPayload) {
    const payload: GetCartRequest = {
      userId: user.id,
    };
    return this.cartService.getCart(payload);
  }
}
