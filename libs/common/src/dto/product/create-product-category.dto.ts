import { IsInt, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateProductCategoryDto {
  @Transform(({ value }) => parseInt(value as string))
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'categoryId',
    }),
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'categoryId',
    }),
  })
  categoryId: number;

  @Transform(({ value }) => parseInt(value as string))
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'productId',
    }),
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'productId',
    }),
  })
  productId: number;
}
