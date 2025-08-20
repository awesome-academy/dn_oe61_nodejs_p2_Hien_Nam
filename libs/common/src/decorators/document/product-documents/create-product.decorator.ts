import { CreateProductDto as CreateProductResponseDto } from '@app/common/dto/document/product-documents/create-product.dto';
import { ApiAdminEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiResponse } from '@nestjs/swagger';

export function ApiResponseCreateProduct() {
  return applyDecorators(
    ApiAdminEndpoint(
      'Tạo sản phẩm mới',
      'Tạo sản phẩm mới với thông tin chi tiết và hình ảnh. Yêu cầu quyền ADMIN. (Yêu cầu JWT Token)',
    ),

    ApiConsumes('multipart/form-data'),
    ApiBody({
      description: 'Thông tin sản phẩm và hình ảnh',
      schema: {
        type: 'object',
        properties: {
          skuId: {
            type: 'string',
            example: 'FOOD001',
            description: 'Mã SKU sản phẩm (duy nhất)',
          },
          name: {
            type: 'string',
            example: 'Bánh mì thịt nướng',
            description: 'Tên sản phẩm',
          },
          description: {
            type: 'string',
            example: 'Bánh mì thịt nướng thơm ngon',
            description: 'Mô tả sản phẩm',
          },
          basePrice: {
            type: 'number',
            example: 25000,
            description: 'Giá cơ bản sản phẩm (VND)',
          },
          quantity: {
            type: 'number',
            example: 100,
            description: 'Số lượng sản phẩm trong kho',
          },
          status: {
            type: 'string',
            example: 'IN_STOCK',
            description: 'Trạng thái sản phẩm',
          },
          categoryIds: {
            type: 'string',
            example: '1,2,3',
            description: 'Danh sách ID danh mục (phân cách bằng dấu phẩy)',
          },
          variants: {
            type: 'string',
            example:
              '[{"price":20000,"startDate":"2025-09-01T08:00:00.000Z","endDate":"2025-12-31T23:59:59.000Z","sizeId":1},{"price":22000,"startDate":"2025-09-01T08:00:00.000Z","endDate":null,"sizeId":2}]',
            description: 'Biến thể sản phẩm (JSON string)',
          },
          images: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary',
            },
            description: 'Hình ảnh sản phẩm (tối đa 10 ảnh)',
          },
        },
        required: [
          'skuId',
          'name',
          'basePrice',
          'quantity',
          'status',
          'categoryIds',
          'variants',
          'images',
        ],
      },
    }),

    ApiResponse({
      status: 200,
      description: 'Tạo sản phẩm thành công',
      type: CreateProductResponseDto,
    }),
  );
}
