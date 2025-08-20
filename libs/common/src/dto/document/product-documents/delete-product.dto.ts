import { ApiProperty } from '@nestjs/swagger';
import { ProductResponse } from '../../product/response/product-response';

export class DeleteProductDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Xóa sản phẩm thành công' })
  message: string;

  @ApiProperty({
    example: {
      id: 1,
      skuId: 'FOOD001',
      name: 'Bánh mì thịt nướng',
      description: 'Bánh mì thịt nướng thơm ngon',
      basePrice: 25000,
      status: 'OUT_OF_STOCK',
      quantity: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      deletedAt: '2024-01-02T00:00:00.000Z',
    },
  })
  payLoad: ProductResponse;
}
