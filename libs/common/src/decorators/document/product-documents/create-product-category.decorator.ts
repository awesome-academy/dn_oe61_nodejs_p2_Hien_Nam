import { CreateProductCategoryResponseDto } from '@app/common/dto/document/product-documents/create-product-category.dto';
import { ApiAdminEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreateProductCategoryDto } from '@app/common/dto/product/create-product-category.dto';

export function ApiResponseCreateProductCategory() {
  return applyDecorators(
    ApiAdminEndpoint(
      'Tạo liên kết danh mục sản phẩm',
      'Tạo liên kết giữa sản phẩm và danh mục. Yêu cầu quyền ADMIN. (Yêu cầu JWT Token)',
    ),

    ApiBody({
      type: CreateProductCategoryDto,
      description: 'Thông tin liên kết danh mục sản phẩm cần tạo',
      examples: {
        example1: {
          summary: 'Tạo liên kết danh mục sản phẩm',
          value: {
            productId: 1,
            categoryId: 2,
          },
        },
      },
    }),

    ApiResponse({
      status: 200,
      description: 'Tạo liên kết danh mục sản phẩm thành công',
      type: CreateProductCategoryResponseDto,
    }),
  );
}
