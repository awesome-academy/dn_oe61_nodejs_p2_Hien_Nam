import { MIN_LENGTH_PASSWORD } from '@app/common/constant/validation.constant';
import { RoleEnum } from '@app/common/enums/role.enum';
import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    type: String,
  })
  @IsString({ message: i18nValidationMessage('common.validation.isString', { field: 'name' }) })
  @IsNotEmpty({ message: i18nValidationMessage('common.validation.isNotEmpty', { field: 'name' }) })
  name: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
    type: String,
    format: 'email',
  })
  @IsEmail({}, { message: i18nValidationMessage('common.validation.isEmail', { field: 'email' }) })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', { field: 'email' }),
  })
  email: string;

  @ApiProperty({
    description: 'Password for the user account',
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
  @ApiProperty({
    description: 'Profile image URL',
    example: 'https://example.com/profile-image.jpg',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('common.validation.isString', { field: 'imageUrl' }) })
  imageUrl?: string;
  @ApiProperty({
    description: 'Phone number in Vietnamese format',
    example: '0987654321',
    type: String,
    pattern: '^(0|\\+84)(\\d{9})$',
    required: false,
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', { field: 'phoneNumber' }),
  })
  @Matches(/^(0|\+84)(\d{9})$/, {
    message: i18nValidationMessage('common.validation.phoneInvalidType', { field: 'phoneNumber' }),
  })
  phone?: string;
  @ApiProperty({
    description: 'Date of birth',
    example: '1990-01-15',
    type: Date,
    required: false,
  })
  @IsOptional()
  @IsDate({ message: i18nValidationMessage('common.validation.isDate', { field: 'DateOfBirth' }) })
  dateOfBirth?: Date;
  @ApiProperty({
    description: 'User address',
    example: '123 Main Street, Ho Chi Minh City',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('common.validation.isString', { field: 'address' }) })
  address?: string;
  @ApiProperty({
    description: 'User role',
    enum: RoleEnum,
    example: RoleEnum.USER,
  })
  @Transform(({ value }) => {
    if (!value) return undefined;
    return String(value).toUpperCase();
  })
  @IsEnum(RoleEnum, {
    message: i18nValidationMessage('common.validation.isEnum', { field: 'role' }),
  })
  role: RoleEnum;
}
