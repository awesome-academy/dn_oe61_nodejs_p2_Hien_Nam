import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsNotEmpty } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class DeleteProductCartRequest {
  @ApiProperty({
    description: 'ID of the user removing products from cart',
    example: 123,
    type: Number,
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'userId',
    }),
  })
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'userId',
    }),
  })
  userId: number;
  @ApiProperty({
    description: 'Array of product variant IDs to remove from cart',
    example: [456, 789, 101],
    type: [Number],
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty({
    message: i18nValidationMessage('common.validation.arrayNotEmpty', {
      field: 'productVariantIds',
    }),
  })
  @Type(() => Number)
  @IsInt({
    each: true,
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'productVariantId',
    }),
  })
  productVariantIds: number[];
}
