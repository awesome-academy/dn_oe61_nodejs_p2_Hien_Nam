import { ApiProperty } from '@nestjs/swagger';
import { DeleteReviewResponse } from '../../product/response/delete-review.response';

export class DeleteReviewDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Xóa đánh giá thành công' })
  message: string;

  @ApiProperty({
    example: {
      id: 1,
      rating: 4.5,
      comment: 'Sản phẩm rất ngon và chất lượng',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      deletedAt: '2024-01-02T00:00:00.000Z',
      userId: 1,
      productId: 1,
    },
  })
  payLoad: DeleteReviewResponse;
}
