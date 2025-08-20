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
    }),

    ApiResponse({
      status: 201,
      description: 'Tạo đánh giá thành công',
      type: CreateReviewResponseDto,
    }),
  );
}
