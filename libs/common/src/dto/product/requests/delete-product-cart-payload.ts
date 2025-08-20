import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class DeleteProductCartPayload {
  @ApiProperty({
    description: 'Array of product variant IDs to remove from cart',
    example: [1, 2, 3],
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
