import { DeleteProductCategoryDto as DeleteProductCategoryResponseDto } from '@app/common/dto/document/product-documents/delete-product-category.dto';
import { ApiAdminEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiParam } from '@nestjs/swagger';

export function ApiResponseDeleteProductCategory() {
  return applyDecorators(
    ApiAdminEndpoint(
      'Xóa liên kết danh mục sản phẩm',
      'Xóa liên kết giữa sản phẩm và danh mục. Yêu cầu quyền ADMIN. (Yêu cầu JWT Token)',
    ),

    ApiParam({
      name: 'id',
      description: 'ID của liên kết danh mục sản phẩm cần xóa',
      example: 1,
      type: 'number',
    }),

    ApiResponse({
      status: 200,
      description: 'Xóa liên kết danh mục sản phẩm thành công',
      type: DeleteProductCategoryResponseDto,
    }),
  );
}
