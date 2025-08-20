import { DeleteProductDto as DeleteProductResponseDto } from '@app/common/dto/document/product-documents/delete-product.dto';
import { ApiAdminEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiParam, ApiResponse } from '@nestjs/swagger';

export function ApiResponseDeleteProduct() {
  return applyDecorators(
    ApiAdminEndpoint(
      'Xóa sản phẩm',
      'Xóa sản phẩm theo SKU ID (soft delete). Yêu cầu quyền ADMIN. (Yêu cầu JWT Token)',
    ),

    ApiParam({
      name: 'skuId',
      description: 'Mã SKU của sản phẩm cần xóa',
      example: 'FOOD001',
    }),

    ApiResponse({
      status: 200,
      description: 'Xóa sản phẩm thành công',
      type: DeleteProductResponseDto,
    }),
  );
}
