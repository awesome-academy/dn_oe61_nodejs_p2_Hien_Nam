import { GetProductDetailDto as GetProductDetailResponseDto } from '@app/common/dto/document/product-documents/get-product-detail.dto';
import { ApiAdminEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiParam, ApiResponse } from '@nestjs/swagger';

export function ApiResponseGetProductDetail() {
  return applyDecorators(
    ApiAdminEndpoint(
      'Lấy chi tiết sản phẩm',
      'Lấy thông tin chi tiết sản phẩm theo SKU ID. Yêu cầu quyền ADMIN. (Yêu cầu JWT Token)',
    ),

    ApiParam({
      name: 'skuId',
      description: 'Mã SKU của sản phẩm cần lấy thông tin',
      example: 'FOOD001',
    }),

    ApiResponse({
      status: 200,
      description: 'Lấy sản phẩm thành công',
      type: GetProductDetailResponseDto,
    }),
  );
}
