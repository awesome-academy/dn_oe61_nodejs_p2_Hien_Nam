import { IsEmail, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ProfileFacebookUser {
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'providerId',
    }),
  })
  providerId: string;
  @IsOptional()
  @IsEmail(
    {},
    {
      message: i18nValidationMessage('common.validation.isString', {
        field: 'email',
      }),
    },
  )
  email?: string;
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'firstName',
    }),
  })
  firstName?: string;
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'lastName',
    }),
  })
  lastName?: string;
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'avatarUrl',
    }),
  })
  avatarUrl?: string;
}
