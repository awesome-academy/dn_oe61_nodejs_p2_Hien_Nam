import { ApiProperty } from '@nestjs/swagger';
import { ProductResponse } from '../../product/response/product-response';

export class UpdateProductDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Cập nhật sản phẩm thành công' })
  message: string;

  @ApiProperty({
    example: {
      id: 1,
      skuId: 'FOOD001',
      name: 'Bánh mì thịt nướng cập nhật',
      description: 'Bánh mì thịt nướng thơm ngon đã cập nhật',
      basePrice: 30000,
      status: 'IN_STOCK',
      quantity: 120,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      deletedAt: null,
    },
  })
  payLoad: ProductResponse;
}
