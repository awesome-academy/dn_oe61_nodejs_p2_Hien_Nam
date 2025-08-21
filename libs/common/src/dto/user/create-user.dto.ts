import { IsEmail, IsString, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateUserDto {
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

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'imageUrl',
    }),
  })
  imageUrl?: string;

  @IsOptional()
  @IsEmail(
    {},
    {
      message: i18nValidationMessage('common.validation.isEmail', {
        field: 'email',
      }),
    },
  )
  email?: string;

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'password',
    }),
  })
  password?: string;

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'provider',
    }),
  })
  provider?: string;

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'providerId',
    }),
  })
  providerId?: string;
}
