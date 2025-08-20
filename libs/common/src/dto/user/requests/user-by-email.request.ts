import { IsEmail } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UserByEmailRequest {
  @IsEmail(
    {},
    {
      message: i18nValidationMessage('common.validation.isEmail', {
        field: 'email',
      }),
    },
  )
  email: string;
}
