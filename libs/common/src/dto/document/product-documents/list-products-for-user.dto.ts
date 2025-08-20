import { ApiProperty } from '@nestjs/swagger';
import { UserProductResponse } from '../../product/response/product-response';

export class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Trang hiện tại' })
  currentPage: number;

  @ApiProperty({ example: 5, description: 'Tổng số trang' })
  totalPages: number;

  @ApiProperty({ example: 10, description: 'Số lượng item trên mỗi trang' })
  pageSize: number;

  @ApiProperty({ example: 50, description: 'Tổng số item' })
  totalItems: number;

  @ApiProperty({ example: 10, description: 'Số lượng item trên trang hiện tại' })
  itemsOnPage: number;
}

export class PaginationResultDto {
  @ApiProperty({
    type: [UserProductResponse],
    description: 'Danh sách sản phẩm',
    example: [
      {
        id: 1,
        skuId: 'FOOD001',
        name: 'Bánh mì thịt nướng',
        description: 'Bánh mì thịt nướng thơm ngon',
        status: 'IN_STOCK',
        basePrice: 25000,
        quantity: 100,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        deletedAt: null,
        images: [
          {
            id: 1,
            url: 'https://res.cloudinary.com/example/image/upload/v1234567890/food1.jpg',
          },
        ],
        categories: [
          {
            id: 1,
            categoryId: 1,
            productId: 1,
            category: {
              id: 1,
              name: 'Đồ ăn',
              parentId: null,
            },
          },
        ],
        variants: [],
        reviews: [],
      },
    ],
  })
  items: UserProductResponse[];

  @ApiProperty({ type: PaginationMetaDto, description: 'Thông tin phân trang' })
  paginations: PaginationMetaDto;
}

export class ListProductsForUserDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Lấy danh sách sản phẩm thành công' })
  message: string;

  @ApiProperty({ type: PaginationResultDto, description: 'Dữ liệu sản phẩm với phân trang' })
  payLoad: PaginationResultDto;
}
