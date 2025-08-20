import { UpdateProductCategoryDto as UpdateProductCategoryResponseDto } from '@app/common/dto/document/product-documents/update-product-category.dto';
import { ApiAdminEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { UpdateProductCategoryBodyDto } from '@app/common/dto/product/update-product-category.dto';

export function ApiResponseUpdateProductCategory() {
  return applyDecorators(
    ApiAdminEndpoint(
      'Cập nhật liên kết danh mục sản phẩm',
      'Cập nhật thông tin liên kết giữa sản phẩm và danh mục. Yêu cầu quyền ADMIN. (Yêu cầu JWT Token)',
    ),

    ApiParam({
      name: 'id',
      description: 'ID của liên kết danh mục sản phẩm cần cập nhật',
      example: 1,
      type: 'number',
    }),

    ApiBody({
      type: UpdateProductCategoryBodyDto,
      description: 'Thông tin liên kết danh mục sản phẩm cần cập nhật',
      examples: {
        example1: {
          summary: 'Cập nhật liên kết danh mục sản phẩm',
          value: {
            productId: 1,
            categoryId: 3,
          },
        },
      },
    }),

    ApiResponse({
      status: 200,
      description: 'Cập nhật liên kết danh mục sản phẩm thành công',
      type: UpdateProductCategoryResponseDto,
    }),
  );
}
