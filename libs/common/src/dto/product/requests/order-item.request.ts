import { MIN_QUANTITY_PRODUCT } from '@app/common/constant/product.constant';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class OrderItemRequest {
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
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'note',
    }),
  })
  note?: string;
}
