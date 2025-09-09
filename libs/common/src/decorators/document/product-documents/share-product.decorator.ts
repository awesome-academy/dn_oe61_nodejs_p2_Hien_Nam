import { ShareProductDto as ShareProductResponseDto } from '@app/common/dto/document/product-documents/share-product.dto';
import { ApiUserEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiParam, ApiResponse } from '@nestjs/swagger';

export function ApiResponseShareProduct() {
  return applyDecorators(
    ApiUserEndpoint(
      'Chia sẻ sản phẩm',
      'Tạo liên kết chia sẻ cho sản phẩm. Yêu cầu quyền USER. (Yêu cầu JWT Token)',
    ),

    ApiParam({
      name: 'skuId',
      description: 'ID sản phẩm cần chia sẻ',
      example: 'PROD001',
    }),

    ApiResponse({
      status: 201,
      description: 'Tạo liên kết chia sẻ thành công',
      type: ShareProductResponseDto,
    }),
  );
}
