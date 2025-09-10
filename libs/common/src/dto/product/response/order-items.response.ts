import { ApiProperty } from '@nestjs/swagger';

export class OrderItemResponse {
  @ApiProperty({
    description: 'Unique identifier for the order item',
    example: 1,
    type: 'integer',
  })
  id: number;
  @ApiProperty({
    description: 'ID of the product variant',
    example: 123,
    type: 'integer',
  })
  productVariantId: number;
  @ApiProperty({
    description: 'Name of the product',
    example: 'Margherita Pizza',
  })
  productName: string;
  @ApiProperty({
    description: 'Size of the product',
    example: 'Large',
  })
  productSize: string;
  @ApiProperty({
    description: 'Quantity ordered',
    example: 2,
    type: 'integer',
  })
  quantity: number;
  @ApiProperty({
    description: 'Price per unit',
    example: 15.99,
    type: 'number',
  })
  price: number;
  @ApiProperty({
    description: 'Optional note for this item',
    example: 'Extra spicy please',
    nullable: true,
  })
  note: string | null;
}
