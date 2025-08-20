import { MIN_LENGTH_PASSWORD } from '@app/common/constant/validation.constant';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class LoginRequestDto {
  @IsEmail(
    {},
    {
      message: i18nValidationMessage('common.validation.isEmail', {
        field: 'email',
      }),
    },
  )
  email: string;
  @IsString({ message: i18nValidationMessage('common.validation.isString', { field: 'password' }) })
  @MinLength(MIN_LENGTH_PASSWORD, {
    message: i18nValidationMessage('common.validation.minLength', { min: MIN_LENGTH_PASSWORD }),
  })
  password: string;
}
