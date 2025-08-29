import { IsUrl } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ImagesDto {
  @IsUrl(
    {},
    {
      message: i18nValidationMessage('common.validation.isUrl', { field: 'url' }),
    },
  )
  url: string;
}
