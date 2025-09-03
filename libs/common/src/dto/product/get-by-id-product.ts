import { IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class GetByIdProductDto {
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'skuId',
    }),
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'skuId',
    }),
  })
  skuId: string;
}
