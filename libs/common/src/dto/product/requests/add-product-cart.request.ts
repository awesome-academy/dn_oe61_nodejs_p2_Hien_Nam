import { MIN_QUANTITY_PRODUCT } from '@app/common/constant/product.constant';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class AddProductCartRequest {
  @ApiProperty({
    description: 'ID of the user adding the product to cart',
    example: 123,
    type: Number,
  })
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'userId',
    }),
  })
  userId: number;
  @ApiProperty({
    description: 'ID of the product variant to add to cart',
    example: 456,
    type: Number,
  })
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'productVariantId',
    }),
  })
  productVariantId: number;
  @ApiProperty({
    description: 'Quantity of the product to add to cart',
    example: 2,
    type: Number,
    minimum: MIN_QUANTITY_PRODUCT,
  })
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'quantity',
    }),
  })
  @Min(MIN_QUANTITY_PRODUCT, {
    message: i18nValidationMessage('common.validation.min', {
      field: 'quantity',
      value: MIN_QUANTITY_PRODUCT,
    }),
  })
  quantity: number;
}
