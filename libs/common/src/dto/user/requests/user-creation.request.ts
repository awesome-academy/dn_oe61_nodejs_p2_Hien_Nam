import { MIN_LENGTH_PASSWORD } from '@app/common/constant/validation.constant';
import { RoleEnum } from '@app/common/enums/role.enum';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  IsOptional,
  IsEnum,
  IsDate,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UserCreationRequest {
  @IsString({ message: i18nValidationMessage('common.validation.isString', { field: 'name' }) })
  @IsNotEmpty({ message: i18nValidationMessage('common.validation.isNotEmpty', { field: 'name' }) })
  name: string;

  @IsEmail({}, { message: i18nValidationMessage('common.validation.isEmail', { field: 'email' }) })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', { field: 'email' }),
  })
  email: string;

  @IsString({ message: i18nValidationMessage('common.validation.isString', { field: 'password' }) })
  @MinLength(MIN_LENGTH_PASSWORD, {
    message: i18nValidationMessage('common.validation.minLength', { min: MIN_LENGTH_PASSWORD }),
  })
  password: string;
  @IsOptional()
  @IsString({ message: i18nValidationMessage('common.validation.isString', { field: 'imageUrl' }) })
  imageUrl?: string;
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', { field: 'phoneNumber' }),
  })
  @Matches(/^(0|\+84)(\d{9})$/, {
    message: i18nValidationMessage('common.validation.phoneInvalidType', { field: 'phoneNumber' }),
  })
  phone?: string;
  @IsOptional()
  @IsDate({ message: i18nValidationMessage('common.validation.isDate', { field: 'DateOfBirth' }) })
  dateOfBirth?: Date;
  @IsOptional()
  @IsString({ message: i18nValidationMessage('common.validation.isString', { field: 'address' }) })
  address?: string;
  @Transform(({ value }) => {
    if (!value) return undefined;
    return String(value).toUpperCase();
  })
  @IsEnum(RoleEnum, {
    message: i18nValidationMessage('common.validation.isEnum', { field: 'role' }),
  })
  role: RoleEnum;
}
