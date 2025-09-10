import { MIN_LENGTH_PASSWORD } from '@app/common/constant/validation.constant';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class LoginRequestDto {
  @ApiProperty({
    description: 'User email address for login',
    example: 'user@example.com',
    type: String,
    format: 'email',
  })
  @IsEmail(
    {},
    {
      message: i18nValidationMessage('common.validation.isEmail', {
        field: 'email',
      }),
    },
  )
  email: string;
  @ApiProperty({
    description: 'User password for login',
    example: 'SecurePassword123!',
    type: String,
    minLength: MIN_LENGTH_PASSWORD,
    format: 'password',
  })
  @IsString({ message: i18nValidationMessage('common.validation.isString', { field: 'password' }) })
  @MinLength(MIN_LENGTH_PASSWORD, {
    message: i18nValidationMessage('common.validation.minLength', { min: MIN_LENGTH_PASSWORD }),
  })
  password: string;
}
