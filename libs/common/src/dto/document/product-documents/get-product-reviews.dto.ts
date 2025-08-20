import { ApiProperty } from '@nestjs/swagger';
import { ReviewResponse } from '../../product/response/review-response.dto';
import { PaginationResult } from '../../../interfaces/pagination';

export class GetProductReviewsDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Lấy danh sách đánh giá thành công' })
  message: string;

  @ApiProperty({
    example: {
      items: [
        {
          id: 1,
          rating: 4.5,
          comment: 'Sản phẩm rất ngon và chất lượng',
          userId: 1,
          productId: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          rating: 5.0,
          comment: 'Tuyệt vời, sẽ mua lại',
          userId: 2,
          productId: 1,
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ],
      paginations: {
        currentPage: 1,
        totalPages: 3,
        pageSize: 10,
        totalItems: 25,
        itemsOnPage: 2,
      },
    },
  })
  payLoad: PaginationResult<ReviewResponse>;
}
