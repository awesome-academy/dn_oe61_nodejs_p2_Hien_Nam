import { DeleteReviewDto as DeleteReviewResponseDto } from '@app/common/dto/document/product-documents/delete-review.dto';
import { ApiUserEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiParam, ApiResponse } from '@nestjs/swagger';

export function ApiResponseDeleteReview() {
  return applyDecorators(
    ApiUserEndpoint(
      'Xóa đánh giá sản phẩm',
      'Xóa đánh giá của người dùng. Yêu cầu quyền USER. (Yêu cầu JWT Token)',
    ),

    ApiParam({
      name: 'reviewId',
      description: 'ID đánh giá cần xóa',
      example: 1,
    }),

    ApiResponse({
      status: 200,
      description: 'Xóa đánh giá thành công',
      type: DeleteReviewResponseDto,
    }),
  );
}
