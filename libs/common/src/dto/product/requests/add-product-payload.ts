import { MIN_QUANTITY_PRODUCT } from '@app/common/constant/product.constant';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class AddProductCartPayload {
  @ApiProperty({
    description: 'ID of the product variant to add to cart',
    example: 1,
    type: 'integer',
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
    type: 'integer',
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
