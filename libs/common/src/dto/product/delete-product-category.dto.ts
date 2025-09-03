import { IsInt, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

export class DeleteProductCategoryDto {
  @Transform(({ value }) => parseInt(value as string))
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', { field: 'id' }),
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', { field: 'id' }),
  })
  id: number;
}
