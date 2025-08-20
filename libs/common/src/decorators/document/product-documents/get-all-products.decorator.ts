import { GetAllProductsDto as GetAllProductsResponseDto } from '@app/common/dto/document/product-documents/get-all-products.dto';
import { ApiAdminEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';

export function ApiResponseGetAllProducts() {
  return applyDecorators(
    ApiAdminEndpoint(
      'Lấy danh sách sản phẩm',
      'Lấy danh sách tất cả sản phẩm với phân trang. Yêu cầu quyền ADMIN. (Yêu cầu JWT Token)',
    ),

    ApiQuery({
      name: 'page',
      description: 'Số trang (bắt đầu từ 1)',
      example: 1,
      required: false,
    }),

    ApiQuery({
      name: 'limit',
      description: 'Số lượng sản phẩm trên mỗi trang',
      example: 10,
      required: false,
    }),

    ApiResponse({
      status: 200,
      description: 'Lấy danh sách sản phẩm thành công',
      type: GetAllProductsResponseDto,
    }),
  );
}
