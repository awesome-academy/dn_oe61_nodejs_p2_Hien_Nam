import { IsInt, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateProductCategoryBodyDto {
  @Transform(({ value }) => parseInt(value as string))
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', { field: 'categoryId' }),
  })
  @IsOptional()
  categoryId?: number;

  @Transform(({ value }) => parseInt(value as string))
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', { field: 'productId' }),
  })
  @IsOptional()
  productId?: number;
}

export class UpdateProductCategoryDto extends UpdateProductCategoryBodyDto {
  id: number;
}
