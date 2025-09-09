import { ApiProperty } from '@nestjs/swagger';
import { ProductImagesResponse } from '../../product/response/product-images.response.dto';

export class CreateProductImagesDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Tạo ảnh sản phẩm thành công' })
  message: string;

  @ApiProperty({
    example: [
      {
        id: 1,
        productId: 1,
        url: 'https://res.cloudinary.com/example/image/upload/v1234567890/product1.jpg',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        productId: 1,
        url: 'https://res.cloudinary.com/example/image/upload/v1234567890/product2.jpg',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
  })
  payLoad: ProductImagesResponse[];
}
