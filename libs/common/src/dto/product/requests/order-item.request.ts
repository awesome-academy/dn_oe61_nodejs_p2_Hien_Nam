import { MIN_QUANTITY_PRODUCT } from '@app/common/constant/product.constant';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemRequest {
  @ApiProperty({
    description: 'ID of the product variant to order',
    example: 1,
    type: 'integer',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'productVariantId',
    }),
  })
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'productVariantId',
    }),
  })
  productVariantId: number;
  @ApiProperty({
    description: 'Quantity of the product to order',
    example: 2,
    type: 'integer',
    minimum: MIN_QUANTITY_PRODUCT,
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'quantity',
    }),
  })
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'quantity',
    }),
  })
  @Min(MIN_QUANTITY_PRODUCT, {
    message: i18nValidationMessage('common.validation.min', {
      field: 'quantity',
      min: MIN_QUANTITY_PRODUCT,
    }),
  })
  quantity: number;
  @ApiPropertyOptional({
    description: 'Optional note for this specific item',
    example: 'Extra spicy please',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'note',
    }),
  })
  note?: string;
}
