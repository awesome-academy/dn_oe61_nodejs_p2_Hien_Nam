import { DeleteProductImagesResponseDto } from '@app/common/dto/document/product-documents/delete-product-images.dto';
import { ApiAdminEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiBody } from '@nestjs/swagger';
import { DeleteProductImagesDto } from '@app/common/dto/product/delete-product-images.dto';

export function ApiResponseDeleteProductImages() {
  return applyDecorators(
    ApiAdminEndpoint(
      'Xóa ảnh sản phẩm',
      'Xóa các ảnh của sản phẩm theo danh sách ID. Yêu cầu quyền ADMIN. (Yêu cầu JWT Token)',
    ),

    ApiBody({
      type: DeleteProductImagesDto,
      description: 'Danh sách ID ảnh sản phẩm cần xóa',
      examples: {
        example1: {
          summary: 'Xóa ảnh sản phẩm',
          value: {
            productImageIds: [1, 2, 3],
          },
        },
      },
    }),

    ApiResponse({
      status: 200,
      description: 'Xóa ảnh sản phẩm thành công',
      type: DeleteProductImagesResponseDto,
    }),
  );
}
