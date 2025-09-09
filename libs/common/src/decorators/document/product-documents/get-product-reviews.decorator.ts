import { GetProductReviewsDto as GetProductReviewsResponseDto } from '@app/common/dto/document/product-documents/get-product-reviews.dto';
import { ApiPublicEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';

export function ApiResponseGetProductReviews() {
  return applyDecorators(
    ApiPublicEndpoint(
      'Lấy danh sách đánh giá sản phẩm',
      'Lấy danh sách đánh giá của sản phẩm với phân trang. Endpoint công khai.',
    ),

    ApiParam({
      name: 'skuId',
      description: 'ID sản phẩm',
      example: 'PROD001',
    }),

    ApiQuery({
      name: 'page',
      description: 'Số trang (bắt đầu từ 1)',
      example: 1,
      required: false,
    }),

    ApiQuery({
      name: 'pageSize',
      description: 'Số lượng đánh giá trên mỗi trang',
      example: 10,
      required: false,
    }),

    ApiResponse({
      status: 200,
      description: 'Lấy danh sách đánh giá thành công',
      type: GetProductReviewsResponseDto,
    }),
  );
}
