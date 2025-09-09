import { MIN_QUANTITY_PRODUCT } from '@app/common/constant/product.constant';
import { IsInt, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class AddProductCartRequest {
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'userId',
    }),
  })
  userId: number;
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'productVariantId',
    }),
  })
  productVariantId: number;
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
