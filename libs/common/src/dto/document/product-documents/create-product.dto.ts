import { ApiProperty } from '@nestjs/swagger';
import { ProductResponse } from '../../product/response/product-response';

export class CreateProductDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Tạo mới sản phẩm thành công' })
  message: string;

  @ApiProperty({
    example: {
      id: 1,
      skuId: 'FOOD001',
      name: 'Bánh mì thịt nướng',
      description: 'Bánh mì thịt nướng thơm ngon',
      basePrice: 25000,
      status: 'IN_STOCK',
      quantity: 100,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      deletedAt: null,
    },
  })
  payLoad: ProductResponse;
}
