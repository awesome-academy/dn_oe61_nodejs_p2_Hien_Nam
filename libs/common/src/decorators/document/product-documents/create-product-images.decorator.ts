import { CreateProductImagesDto as CreateProductImagesResponseDto } from '@app/common/dto/document/product-documents/create-product-images.dto';
import { ApiAdminEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiBody, ApiConsumes } from '@nestjs/swagger';

export function ApiResponseCreateProductImages() {
  return applyDecorators(
    ApiAdminEndpoint(
      'Tạo ảnh sản phẩm',
      'Upload và tạo ảnh cho sản phẩm. Tối đa 10 ảnh cho mỗi sản phẩm. Yêu cầu quyền ADMIN. (Yêu cầu JWT Token)',
    ),

    ApiConsumes('multipart/form-data'),

    ApiBody({
      description: 'Thông tin sản phẩm và file ảnh cần upload',
      schema: {
        type: 'object',
        properties: {
          productId: {
            type: 'number',
            description: 'ID của sản phẩm',
            example: 1,
          },
          images: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary',
            },
            description: 'Danh sách file ảnh (tối đa 10 ảnh)',
          },
        },
        required: ['productId', 'images'],
      },
    }),

    ApiResponse({
      status: 200,
      description: 'Tạo ảnh sản phẩm thành công',
      type: CreateProductImagesResponseDto,
    }),
  );
}
