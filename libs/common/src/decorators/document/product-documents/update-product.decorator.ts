import { UpdateProductDto as UpdateProductResponseDto } from '@app/common/dto/document/product-documents/update-product.dto';
import { ApiAdminEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';

export function ApiResponseUpdateProduct() {
  return applyDecorators(
    ApiAdminEndpoint(
      'Cập nhật sản phẩm',
      'Cập nhật thông tin sản phẩm theo SKU ID. Yêu cầu quyền ADMIN. (Yêu cầu JWT Token)',
    ),

    ApiParam({
      name: 'skuId',
      description: 'Mã SKU của sản phẩm cần cập nhật',
      example: 'FOOD001',
    }),

    ApiBody({
      description: 'Thông tin sản phẩm cần cập nhật',
      schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            example: 'Bánh mì thịt nướng cập nhật',
            description: 'Tên sản phẩm mới',
          },
          description: {
            type: 'string',
            example: 'Bánh mì thịt nướng thơm ngon đã cập nhật',
            description: 'Mô tả sản phẩm mới',
          },
          basePrice: {
            type: 'number',
            example: 30000,
            description: 'Giá sản phẩm mới (VND)',
          },
          quantity: {
            type: 'number',
            example: 50,
            description: 'Số lượng sản phẩm',
          },
          status: {
            type: 'string',
            example: 'IN_STOCK',
            description: 'Trạng thái sản phẩm',
            enum: ['IN_STOCK', 'OUT_OF_STOCK', 'SOLD_OUT'],
          },
        },
      },
    }),

    ApiResponse({
      status: 200,
      description: 'Cập nhật sản phẩm thành công',
      type: UpdateProductResponseDto,
    }),
  );
}
