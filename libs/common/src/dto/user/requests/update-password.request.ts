import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MinLength, MaxLength, IsNumber } from 'class-validator';

export class UpdatePasswordRequest {
  @IsNotEmpty({ message: 'common.validation.userId.required' })
  @IsNumber({}, { message: 'common.validation.userId.number' })
  userId: number;

  @IsNotEmpty({ message: 'common.validation.currentPassword.required' })
  @IsString({ message: 'common.validation.currentPassword.string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value) as string)
  currentPassword: string;

  @IsNotEmpty({ message: 'common.validation.newPassword.required' })
  @IsString({ message: 'common.validation.newPassword.string' })
  @MinLength(6, { message: 'common.validation.newPassword.minLength' })
  @MaxLength(255, { message: 'common.validation.newPassword.maxLength' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value) as string)
  newPassword: string;

  @IsNotEmpty({ message: 'common.validation.confirmPassword.required' })
  @IsString({ message: 'common.validation.confirmPassword.string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value) as string)
  confirmPassword: string;
}
