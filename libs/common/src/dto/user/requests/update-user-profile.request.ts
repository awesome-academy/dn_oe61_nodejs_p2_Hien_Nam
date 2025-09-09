import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpdateUserProfileRequest {
  @IsOptional()
  @IsNotEmpty({ message: 'common.validation.userId.required' })
  @IsNumber({}, { message: 'common.validation.userId.number' })
  userId?: number;

  @IsOptional()
  @IsString({ message: 'common.validation.name.string' })
  @MaxLength(50, { message: 'common.validation.name.maxLength' })
  @Transform(({ value }) => {
    if (value === '') return undefined;
    return typeof value === 'string' ? value.trim() : (value as string | undefined);
  })
  name?: string;

  @IsOptional()
  @IsString({ message: 'common.validation.userName.string' })
  @MaxLength(50, { message: 'common.validation.userName.maxLength' })
  @Transform(({ value }) => {
    if (value === '') return undefined;
    return typeof value === 'string' ? value.trim() : (value as string | undefined);
  })
  userName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'common.validation.email.format' })
  @MaxLength(50, { message: 'common.validation.email.maxLength' })
  @Transform(({ value }) => {
    if (value === '') return undefined;
    return typeof value === 'string' ? value.trim().toLowerCase() : (value as string | undefined);
  })
  email?: string;

  @IsOptional()
  @IsUrl({}, { message: 'common.validation.imageUrl.format' })
  @MaxLength(255, { message: 'common.validation.imageUrl.maxLength' })
  imageUrl?: string;

  @IsOptional()
  @IsString({ message: 'common.validation.address.string' })
  @MaxLength(255, { message: 'common.validation.address.maxLength' })
  @Transform(({ value }) => {
    if (value === '') return undefined;
    return typeof value === 'string' ? value.trim() : (value as string | undefined);
  })
  address?: string;

  @IsOptional()
  @IsPhoneNumber('VN', { message: 'common.validation.phoneNumber.format' })
  @MaxLength(20, { message: 'common.validation.phoneNumber.maxLength' })
  @Transform(({ value }) => {
    if (value === '') return undefined;
    return typeof value === 'string' ? value.trim() : (value as string | undefined);
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString({ message: 'common.validation.dateOfBirth.string' })
  @Transform(({ value }) => {
    if (value === '') return undefined;
    return typeof value === 'string' ? value.trim() : (value as string | undefined);
  })
  dateOfBirth?: string;
}
