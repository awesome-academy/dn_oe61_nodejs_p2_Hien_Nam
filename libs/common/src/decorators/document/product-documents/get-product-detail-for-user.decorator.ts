import { GetProductDetailForUserDto as GetProductDetailForUserResponseDto } from '@app/common/dto/document/product-documents/get-product-detail-for-user.dto';
import { ApiPublicEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiParam, ApiResponse } from '@nestjs/swagger';

export function ApiResponseGetProductDetailForUser() {
  return applyDecorators(
    ApiPublicEndpoint(
      'Lấy chi tiết sản phẩm cho người dùng',
      'Lấy thông tin chi tiết sản phẩm theo SKU ID. Endpoint công khai, không yêu cầu xác thực.',
    ),

    ApiParam({
      name: 'skuId',
      description: 'SKU ID của sản phẩm cần lấy thông tin',
      example: 'FOOD001',
      type: 'string',
    }),

    ApiResponse({
      status: 200,
      description: 'Lấy thông tin sản phẩm thành công',
      type: GetProductDetailForUserResponseDto,
    }),

    ApiResponse({
      status: 400,
      description: 'SKU ID không hợp lệ hoặc sản phẩm không tồn tại',
    }),
  );
}
