import { IsInt, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CategoryDto {
  @IsString({
    message: i18nValidationMessage('common.validation.isString', { field: 'name' }),
  })
  name: string;

  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', { field: 'parentId' }),
  })
  parentId?: number;
}
