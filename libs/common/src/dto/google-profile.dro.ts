import { IsEmail, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class GoogleProfileDto {
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'googleId',
    }),
  })
  googleId: string;

  @IsEmail(
    {},
    {
      message: i18nValidationMessage('common.validation.isEmail', {
        field: 'email',
      }),
    },
  )
  email: string;

  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'userName',
    }),
  })
  userName: string;

  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'name',
    }),
  })
  name: string;
}
