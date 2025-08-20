import { ApiProperty } from '@nestjs/swagger';
import { ShareUrlProductResponse } from '../../product/response/share-url-product-response';

export class ShareProductDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Chia sẻ sản phẩm thành công' })
  message: string;

  @ApiProperty({
    example: {
      messengerShare:
        'https://www.facebook.com/dialog/send?app_id=123456&link=https%3A%2F%2Fexample.com%2Fproduct%2FFOOD001&redirect_uri=https%3A%2F%2Fexample.com',
      facebookShare:
        'https://www.facebook.com/dialog/share?app_id=123456&display=popup&href=https%3A%2F%2Fexample.com%2Fproduct%2FFOOD001',
      productUrl: 'https://example.com/product/FOOD001',
    },
  })
  payLoad: ShareUrlProductResponse;
}
