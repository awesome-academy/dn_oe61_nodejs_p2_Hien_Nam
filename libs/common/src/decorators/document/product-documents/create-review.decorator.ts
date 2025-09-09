import { CreateReviewResponseDto } from '@app/common/dto/document/product-documents/create-review.dto';
import { ApiUserEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CreateReviewDto } from '@app/common/dto/product/requests/create-review.dto';

export function ApiResponseCreateReview() {
  return applyDecorators(
    ApiUserEndpoint(
      'Tạo đánh giá sản phẩm',
      'Tạo đánh giá mới cho sản phẩm. Yêu cầu quyền USER. (Yêu cầu JWT Token)',
    ),

    ApiParam({
      name: 'skuId',
      description: 'ID sản phẩm',
      example: 'PROD001',
    }),

    ApiBody({
      type: CreateReviewDto,
      description: 'Thông tin đánh giá',
      examples: {
        'Đánh giá tích cực': {
          summary: 'Đánh giá 5 sao với bình luận tích cực',
          value: {
            rating: 5,
            comment: 'Sản phẩm rất tuyệt vời! Chất lượng tốt, giao hàng nhanh. Tôi sẽ mua lại.',
          },
        },
        'Đánh giá trung bình': {
          summary: 'Đánh giá 3 sao với bình luận trung tính',
          value: {
            rating: 3,
            comment: 'Sản phẩm ổn, không có gì đặc biệt. Giá cả hợp lý.',
          },
        },
        'Đánh giá ngắn gọn': {
          summary: 'Đánh giá 4 sao với bình luận ngắn',
          value: {
            rating: 4,
            comment: 'Tốt!',
          },
        },
      },
    }),

    ApiResponse({
      status: 201,
      description: 'Tạo đánh giá thành công',
      type: CreateReviewResponseDto,
    }),
  );
}
