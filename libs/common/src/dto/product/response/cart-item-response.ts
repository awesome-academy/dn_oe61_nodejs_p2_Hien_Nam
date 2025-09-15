import { ApiProperty } from '@nestjs/swagger';

export class CartItemResponse {
  @ApiProperty({
    description: 'Unique identifier of the cart item',
    example: 1,
    type: Number,
  })
  id: number;
  @ApiProperty({
    description: 'Quantity of the product in the cart',
    example: 2,
    type: Number,
  })
  quantity: number;
  @ApiProperty({
    description: 'Product variant information',
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Product variant ID',
        example: 101,
      },
      price: {
        type: 'number',
        description: 'Price of the product variant',
        example: 75000,
      },
    },
  })
  productVariant: {
    id: number;
    price: number;
  };
}
