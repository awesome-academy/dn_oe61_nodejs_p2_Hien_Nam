import { ListProductsForUserDto as ListProductsForUserResponseDto } from '@app/common/dto/document/product-documents/list-products-for-user.dto';
import { ApiUserEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';

export function ApiResponseListProductsForUser() {
  return applyDecorators(
    ApiUserEndpoint(
      'Lấy danh sách sản phẩm cho người dùng',
      'Lấy danh sách sản phẩm với bộ lọc và phân trang. Trả về dữ liệu có thông tin phân trang. Yêu cầu quyền USER. (Yêu cầu JWT Token)',
    ),

    ApiQuery({
      name: 'page',
      description: 'Số trang (bắt đầu từ 1)',
      example: 1,
      required: false,
    }),

    ApiQuery({
      name: 'pageSize',
      description: 'Số lượng sản phẩm trên mỗi trang',
      example: 10,
      required: false,
    }),

    ApiQuery({
      name: 'name',
      description: 'Tìm kiếm theo tên sản phẩm',
      example: 'bánh mì',
      required: false,
    }),

    ApiQuery({
      name: 'categoryId',
      description: 'Lọc theo ID danh mục',
      example: 1,
      required: false,
    }),

    ApiQuery({
      name: 'rootCategoryId',
      description: 'Lọc theo ID danh mục gốc',
      example: 1,
      required: false,
    }),

    ApiQuery({
      name: 'minPrice',
      description: 'Giá tối thiểu',
      example: 10000,
      required: false,
    }),

    ApiQuery({
      name: 'maxPrice',
      description: 'Giá tối đa',
      example: 100000,
      required: false,
    }),

    ApiQuery({
      name: 'rating',
      description: 'Lọc theo đánh giá (0-5)',
      example: 4,
      required: false,
    }),

    ApiResponse({
      status: 200,
      description: 'Lấy danh sách sản phẩm thành công với thông tin phân trang',
      type: ListProductsForUserResponseDto,
      schema: {
        example: {
          success: true,
          statusCode: 200,
          message: 'Lấy danh sách sản phẩm thành công',
          payLoad: {
            items: [
              {
                id: 1,
                skuId: 'FOOD001',
                name: 'Bánh mì thịt nướng',
                description: 'Bánh mì thịt nướng thơm ngon',
                status: 'IN_STOCK',
                basePrice: 25000,
                quantity: 100,
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
                deletedAt: null,
                images: [],
                categories: [],
                variants: [],
                reviews: [],
              },
            ],
            paginations: {
              currentPage: 1,
              totalPages: 5,
              pageSize: 10,
              totalItems: 50,
              itemsOnPage: 10,
            },
          },
        },
      },
    }),

    ApiResponse({
      status: 401,
      description: 'Không có quyền truy cập',
    }),
  );
}
