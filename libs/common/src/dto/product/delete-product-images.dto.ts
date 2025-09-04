import { IsArray, IsInt } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class DeleteProductImagesDto {
  @IsArray({
    message: i18nValidationMessage('common.validation.isArray', { field: 'productImageIds' }),
  })
  @IsInt({ each: true })
  productImageIds: number[];
}
