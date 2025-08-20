import { ApiProperty } from '@nestjs/swagger';
import { CartItemResponse } from './cart-item-response';

export class CartSummaryResponse {
  @ApiProperty({
    description: 'Unique identifier of the cart',
    example: 1,
    type: Number,
    required: false,
  })
  cartId?: number;
  @ApiProperty({
    description: 'ID of the user who owns the cart',
    example: 123,
    type: Number,
  })
  userId: number;
  @ApiProperty({
    description: 'List of items in the cart',
    type: () => [CartItemResponse],
    isArray: true,
  })
  cartItems: CartItemResponse[];
  @ApiProperty({
    description: 'Total quantity of all items in the cart',
    example: 5,
    type: Number,
  })
  totalQuantity: number;
  @ApiProperty({
    description: 'Total amount of all items in the cart',
    example: 150000,
    type: Number,
  })
  totalAmount: number;
}
