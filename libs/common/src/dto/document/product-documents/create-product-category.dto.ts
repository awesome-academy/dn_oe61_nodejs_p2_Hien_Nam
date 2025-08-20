import { ApiProperty } from '@nestjs/swagger';
import { ProductCategoryResponse } from '../../product/response/product-category-response';

export class CreateProductCategoryResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Tạo liên kết danh mục sản phẩm thành công' })
  message: string;

  @ApiProperty({
    example: {
      id: 1,
      productId: 1,
      categoryId: 2,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  })
  payLoad: ProductCategoryResponse;
}
