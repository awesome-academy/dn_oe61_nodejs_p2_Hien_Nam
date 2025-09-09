import { ApiProperty } from '@nestjs/swagger';
import { CreateReviewResponse } from '../../product/response/review-response.dto';

export class CreateReviewResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Tạo đánh giá thành công' })
  message: string;

  @ApiProperty({
    example: {
      id: 1,
      rating: 4.5,
      comment: 'Sản phẩm rất ngon và chất lượng',
      createdAt: '2024-01-01T00:00:00.000Z',
      userId: 1,
      productId: 1,
    },
  })
  payLoad: CreateReviewResponse;
}
