import { ApiProperty } from '@nestjs/swagger';
import { ProductResponse } from '../../product/response/product-response';
import { PaginationResult } from '../../../interfaces/pagination';

export class GetAllProductsDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Lấy danh sách sản phẩm thành công' })
  message: string;

  @ApiProperty({
    example: {
      items: [
        {
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
        {
          id: 2,
          skuId: 'DRINK001',
          name: 'Cà phê sữa đá',
          description: 'Cà phê sữa đá truyền thống',
          basePrice: 15000,
          status: 'IN_STOCK',
          quantity: 50,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          deletedAt: null,
        },
      ],
      paginations: {
        currentPage: 1,
        totalPages: 5,
        pageSize: 10,
        totalItems: 50,
        itemsOnPage: 2,
      },
    },
  })
  payLoad: PaginationResult<ProductResponse>;
}
