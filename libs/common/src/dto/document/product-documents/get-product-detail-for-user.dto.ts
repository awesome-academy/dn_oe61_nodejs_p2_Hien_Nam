import { ApiProperty } from '@nestjs/swagger';
import { UserProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';

export class GetProductDetailForUserDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Lấy chi tiết sản phẩm thành công' })
  message: string;

  @ApiProperty({
    type: UserProductDetailResponse,
    description: 'Thông tin chi tiết sản phẩm cho người dùng',
  })
  payLoad: UserProductDetailResponse;
}
